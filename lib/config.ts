// lib/config.ts
// -----------------------------------------------------------------------------
// Application-wide constants. Nothing here mutates at runtime.

/** Chart / node colour palette (cycled by index). */
export const COLORS: string[] = [
  '#4f8ef7', '#22c999', '#f5a623', '#f05050',
  '#b86ef7', '#2dd4bf', '#fb923c', '#f472b6',
  '#a3e635', '#38bdf8',
];

/** Maximum papers requested per arXiv batch (API hard limit) */
export const ARXIV_BATCH_SIZE = 100;

/** Default maximum papers to fetch per full search */
export const DEFAULT_MAX_RESULTS = 200;

/** Delay (ms) between arXiv batch requests — be polite to the API */
export const ARXIV_BATCH_DELAY_MS = 400;

/**
 * Quick-topic presets shown in the quick-bar.
 * Deliberately spans many disciplines so the app feels welcoming to
 * researchers outside computer science.
 */
export const QUICK_TOPICS: Array<{ label: string; query: string }> = [
  // Life sciences & medicine
  { label: 'CRISPR gene editing',    query: 'CRISPR gene editing' },
  { label: 'Cancer immunotherapy',   query: 'cancer immunotherapy treatment' },
  { label: 'Antibiotic resistance',  query: 'antibiotic resistance bacteria' },
  { label: 'COVID-19 epidemiology',  query: 'COVID-19 epidemiology outcomes' },
  // Social & behavioural science
  { label: 'Mental health social media', query: 'mental health social media' },
  { label: 'Climate policy',         query: 'climate change policy adaptation' },
  { label: 'Income inequality',      query: 'income inequality economic mobility' },
  // Technology (kept but not dominant)
  { label: 'Large language models',  query: 'large language models' },
  { label: 'Quantum computing',      query: 'quantum computing algorithms' },
  { label: 'Federated learning',     query: 'federated learning privacy' },
];