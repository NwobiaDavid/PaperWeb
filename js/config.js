/**
 * config.js
 * ─────────
 * Application-wide constants. Import this before all other modules.
 * Nothing here mutates at runtime.
 */

/** Chart / node colour palette (cycled by index). */
const COLORS = [
  '#4f8ef7', '#22c999', '#f5a623', '#f05050',
  '#b86ef7', '#2dd4bf', '#fb923c', '#f472b6',
  '#a3e635', '#38bdf8',
];

/**
 * CORS proxy factory list.
 * Tried in order; first successful response wins.
 * @type {Array<(url: string) => string>}
 */
const CORS_PROXIES = [
  url => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  url => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  url => `https://cors-anywhere.herokuapp.com/${url}`,
];

/** arXiv Atom API base URL */
const ARXIV_BASE = 'https://export.arxiv.org/api/query';

/** Maximum papers requested per arXiv batch (API limit) */
const ARXIV_BATCH_SIZE = 100;

/** Default maximum papers to fetch per full search */
const DEFAULT_MAX_RESULTS = 200;

/** Delay (ms) between arXiv batch requests to be polite to the API */
const ARXIV_BATCH_DELAY_MS = 400;