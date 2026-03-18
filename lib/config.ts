// lib/config.ts
// ─────────────────────────────────────────────────────────────────────────────
// Application-wide constants. Nothing here mutates at runtime.

/** Chart / node colour palette (cycled by index). */
export const COLORS: string[] = [
  '#4f8ef7', '#22c999', '#f5a623', '#f05050',
  '#b86ef7', '#2dd4bf', '#fb923c', '#f472b6',
  '#a3e635', '#38bdf8',
];

/**
 * CORS proxy factory list.
 * Tried in order; first successful response wins.
 */
export const CORS_PROXIES: Array<(url: string) => string> = [
  url => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  url => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  url => `https://cors-anywhere.herokuapp.com/${url}`,
];

/** arXiv Atom API base URL */
export const ARXIV_BASE = 'https://export.arxiv.org/api/query';

/** Maximum papers requested per arXiv batch (API limit) */
export const ARXIV_BATCH_SIZE = 100;

/** Default maximum papers to fetch per full search */
export const DEFAULT_MAX_RESULTS = 200;

/** Delay (ms) between arXiv batch requests */
export const ARXIV_BATCH_DELAY_MS = 400;

/** Quick-topic presets shown in the quick-bar */
export const QUICK_TOPICS: Array<{ label: string; query: string }> = [
  { label: 'ML in agriculture',    query: 'machine learning in agriculture' },
  { label: 'Medical imaging',      query: 'deep learning medical imaging' },
  { label: 'Climate adaptation',   query: 'climate change adaptation' },
  { label: 'Quantum computing',    query: 'quantum computing algorithms' },
  { label: 'Federated learning',   query: 'federated learning privacy' },
  { label: 'CRISPR',               query: 'CRISPR gene editing' },
  { label: 'Large language models',query: 'large language models' },
  { label: 'Drug discovery',       query: 'drug discovery machine learning' },
];