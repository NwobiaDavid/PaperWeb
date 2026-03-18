/**
 * api.js
 * ──────
 * Network layer: CORS proxy chain and arXiv Atom API client.
 *
 * Depends on: config.js, utils.js
 */

/**
 * Fetch a URL through the CORS proxy chain, falling back to the next
 * proxy on each failure.
 *
 * @param {string} rawUrl   The original (non-proxied) URL.
 * @param {number} [attempt=0]  Internal recursion counter.
 * @returns {Promise<string>}   Raw response text.
 * @throws {Error} if all proxies are exhausted.
 */
async function fetchWithProxy(rawUrl, attempt = 0) {
  if (attempt >= CORS_PROXIES.length) {
    throw new Error(
      'All CORS proxies failed. ' +
      'Try opening the file directly in Chrome (drag the .html file into ' +
      'the browser) rather than via a local server, or use the Python script instead.'
    );
  }

  const proxiedUrl = CORS_PROXIES[attempt](rawUrl);

  try {
    const resp = await fetch(proxiedUrl, { signal: AbortSignal.timeout(12_000) });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    return await resp.text();
  } catch (err) {
    console.warn(`[api] Proxy ${attempt} failed (${err.message}), trying next…`);
    return fetchWithProxy(rawUrl, attempt + 1);
  }
}

/**
 * Fetch paper metadata from the arXiv Atom API in batches.
 *
 * Each paper object has the shape:
 *   { id, title, abstract, year, authors, categories, citations, degree, url }
 *
 * @param {string} topic       Full-text search query.
 * @param {number} [maxResults=DEFAULT_MAX_RESULTS]
 * @returns {Promise<object[]>}
 */
async function fetchArxiv(topic, maxResults = DEFAULT_MAX_RESULTS) {
  const allPapers = [];
  let start = 0;

  while (allPapers.length < maxResults) {
    const count  = Math.min(ARXIV_BATCH_SIZE, maxResults - allPapers.length);
    const rawUrl =
      `${ARXIV_BASE}?search_query=all:${encodeURIComponent(topic)}` +
      `&start=${start}&max_results=${count}&sortBy=relevance`;

    setLoadingText(
      `Fetching papers ${allPapers.length + 1}–${allPapers.length + count} from arXiv…`,
      'Routing via CORS proxy…'
    );

    const xml     = await fetchWithProxy(rawUrl);
    const doc     = new DOMParser().parseFromString(xml, 'text/xml');
    const entries = doc.querySelectorAll('entry');

    if (!entries.length) break;

    entries.forEach(entry => {
      const id = (entry.querySelector('id')?.textContent || '')
        .split('/abs/').pop().trim();
      const title = entry.querySelector('title')
        ?.textContent?.replace(/\s+/g, ' ').trim() || '';
      const abstract = entry.querySelector('summary')
        ?.textContent?.replace(/\s+/g, ' ').trim() || '';
      const pub  = entry.querySelector('published')?.textContent?.slice(0, 10) || '';
      const year = parseInt(pub.slice(0, 4)) || 0;
      const authors    = [...entry.querySelectorAll('author name')]
        .map(a => a.textContent.trim());
      const categories = [...entry.querySelectorAll('category')]
        .map(c => c.getAttribute('term') || '');

      if (title && id) {
        allPapers.push({
          id,
          title,
          abstract,
          year,
          authors,
          categories,
          citations: 0,
          degree:    0,
          url: `https://arxiv.org/abs/${id}`,
        });
      }
    });

    start += count;
    if (entries.length < count) break;  // arXiv returned fewer than requested → end
    await sleep(ARXIV_BATCH_DELAY_MS);
  }

  return allPapers.slice(0, maxResults);
}