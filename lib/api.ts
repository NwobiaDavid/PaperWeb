// lib/api.ts
// -----------------------------------------------------------------------------
// Network layer: arXiv client that calls the internal Next.js proxy route.
//
// All arXiv fetches go through /api/arxiv which runs server-side — no CORS
// restrictions, no third-party proxy, no 403s on deployed domains.

import {
  ARXIV_BATCH_SIZE,
  DEFAULT_MAX_RESULTS,
  ARXIV_BATCH_DELAY_MS,
} from './config';
import type { Paper } from './types';

/** Promise-based sleep used for rate-limiting between batches. */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Fetch one batch of arXiv results via the internal server-side proxy.
 * Returns raw Atom XML as a string.
 */
async function fetchBatch(params: URLSearchParams): Promise<string> {
  const url = `/api/arxiv?${params.toString()}`;

  const resp = await fetch(url, { signal: AbortSignal.timeout(25_000) });

  if (!resp.ok) {
    throw new Error(
      `arXiv proxy returned ${resp.status}: ${await resp.text().catch(() => '')}`
    );
  }

  return resp.text();
}

/**
 * Fetch paper metadata from arXiv in batches via /api/arxiv.
 *
 * Each paper in the returned array conforms to the Paper interface.
 * The optional onProgress callback is called before each batch so the
 * caller can update loading UI.
 */
export async function fetchArxiv(
  topic: string,
  maxResults: number = DEFAULT_MAX_RESULTS,
  onProgress?: (text: string, sub: string) => void,
): Promise<Paper[]> {
  const allPapers: Paper[] = [];
  let start = 0;

  while (allPapers.length < maxResults) {
    const count = Math.min(ARXIV_BATCH_SIZE, maxResults - allPapers.length);

    onProgress?.(
      `Fetching papers ${allPapers.length + 1}–${allPapers.length + count} from arXiv…`,
      'Querying…',
    );

    const params = new URLSearchParams({
      search_query: `all:${topic}`,
      start:        String(start),
      max_results:  String(count),
      sortBy:       'relevance',
    });

    const xml     = await fetchBatch(params);
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
    if (entries.length < count) break;   // arXiv has no more results
    await sleep(ARXIV_BATCH_DELAY_MS);
  }

  return allPapers.slice(0, maxResults);
}