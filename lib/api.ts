// lib/api.ts
// ─────────────────────────────────────────────────────────────────────────────
// Network layer: CORS proxy chain and arXiv Atom API client.

import {
  CORS_PROXIES,
  ARXIV_BASE,
  ARXIV_BATCH_SIZE,
  DEFAULT_MAX_RESULTS,
  ARXIV_BATCH_DELAY_MS,
} from './config';
import type { Paper } from './types';

/** Promise-based sleep helper used for rate-limiting. */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Fetch a URL through the CORS proxy chain, falling back to the next proxy
 * on each failure.
 */
export async function fetchWithProxy(
  rawUrl: string,
  attempt = 0
): Promise<string> {
  if (attempt >= CORS_PROXIES.length) {
    throw new Error(
      'All CORS proxies failed. '
    );
  }

  const proxiedUrl = CORS_PROXIES[attempt](rawUrl);

  try {
    const resp = await fetch(proxiedUrl, { signal: AbortSignal.timeout(12_000) });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    return await resp.text();
  } catch (err) {
    console.warn(`[api] Proxy ${attempt} failed (${(err as Error).message}), trying next…`);
    return fetchWithProxy(rawUrl, attempt + 1);
  }
}

/**
 * Fetch paper metadata from the arXiv Atom API in batches.
 *
 * Each yielded paper has the shape defined by the `Paper` interface.
 * The `onProgress` callback lets the caller update loading UI.
 */
export async function fetchArxiv(
  topic: string,
  maxResults: number = DEFAULT_MAX_RESULTS,
  onProgress?: (text: string, sub: string) => void
): Promise<Paper[]> {
  const allPapers: Paper[] = [];
  let start = 0;

  while (allPapers.length < maxResults) {
    const count  = Math.min(ARXIV_BATCH_SIZE, maxResults - allPapers.length);
    const rawUrl =
      `${ARXIV_BASE}?search_query=all:${encodeURIComponent(topic)}` +
      `&start=${start}&max_results=${count}&sortBy=relevance`;

    onProgress?.(
      `Fetching papers ${allPapers.length + 1}–${allPapers.length + count} from arXiv…`,
      'Routing via CORS proxy…'
    );

    const xml     = await fetchWithProxy(rawUrl);
    const doc     = new DOMParser().parseFromString(xml, 'text/xml');
    const entries = doc.querySelectorAll('entry');

    if (!entries.length) break;

    entries.forEach(entry => {
      const id = (entry.querySelector('id')?.textContent ?? '')
        .split('/abs/').pop()?.trim() ?? '';
      const title = entry.querySelector('title')
        ?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
      const abstract = entry.querySelector('summary')
        ?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
      const pub  = entry.querySelector('published')?.textContent?.slice(0, 10) ?? '';
      const year = parseInt(pub.slice(0, 4)) || 0;
      const authors    = Array.from(entry.querySelectorAll('author name'))
        .map(a => a.textContent?.trim() ?? '');
      const categories = Array.from(entry.querySelectorAll('category'))
        .map(c => c.getAttribute('term') ?? '');

      if (title && id) {
        allPapers.push({
          id, title, abstract, year, authors, categories,
          citations: 0,
          degree:    0,
          url: `https://arxiv.org/abs/${id}`,
        });
      }
    });

    start += count;
    if (entries.length < count) break;
    await sleep(ARXIV_BATCH_DELAY_MS);
  }

  return allPapers.slice(0, maxResults);
}