// lib/network.ts
// -----------------------------------------------------------------------------
// Pure data-processing: builds the citation/co-authorship edge list and
// computes keyword frequency trends over time. No DOM interaction.
//
// Field-agnostic design — works equally well for CS, medicine, biology,
// social science, economics, history, and any other arXiv discipline.

import type { Paper, Edge, TrendSeries } from './types';

// ── Stop-words ────────────────────────────────────────────────────────────────
// Common words that carry no topical meaning. Filtered out before any
// keyword extraction so they don't pollute similarity scores or trend charts.
const STOP_WORDS = new Set([
  'the','and','for','are','was','were','with','that','this','from','have',
  'has','been','also','which','their','they','will','would','could','should',
  'more','into','than','some','other','about','when','there','these','those',
  'such','each','data','show','shows','shown','using','used','use','based',
  'result','results','paper','study','studies','method','methods','approach',
  'approaches','proposed','present','presents','analysis','work','new','high',
  'low','large','small','both','two','three','our','its','can','may','not',
  'all','any','one','first','second','third','between','among','across','over',
  'under','after','before','during','within','without','through','while',
]);

/**
 * Extract the N most meaningful words from a text string.
 * Strips stop-words, short tokens, and pure numbers.
 */
function keywords(text: string, n = 12): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 4 && !STOP_WORDS.has(w) && !/^\d+$/.test(w))
    .slice(0, n);
}

/**
 * Jaccard similarity between two sets.
 * Returns a value in [0, 1].
 */
function jaccard(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let intersection = 0;
  for (const w of a) if (b.has(w)) intersection++;
  return intersection / (a.size + b.size - intersection);
}

// ── Network builder ───────────────────────────────────────────────────────────

/**
 * Build a list of edges from paper metadata.
 *
 * Two edge types are created:
 *
 *   coauthor  — papers that share at least one author. Direct and reliable
 *               for any field.
 *
 *   citation  — papers whose title+abstract keyword sets are sufficiently
 *               similar (Jaccard ≥ 0.12). This is a content-similarity proxy
 *               that works for any discipline, unlike the old approach which
 *               used random category overlap (meaningless for non-CS fields).
 *
 * Also mutates each paper object in-place, adding a `degree` count.
 */
export function buildNetwork(papers: Paper[]): Edge[] {
  const edges: Edge[] = [];
  const seen  = new Set<string>();

  // ── Co-authorship edges ──────────────────────────────────────────────────
  const authorMap: Record<string, string[]> = {};
  papers.forEach(p =>
    p.authors.forEach(a => {
      if (!authorMap[a]) authorMap[a] = [];
      authorMap[a].push(p.id);
    })
  );

  Object.values(authorMap).forEach(ids => {
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const key = [ids[i], ids[j]].sort().join('|');
        if (!seen.has(key)) {
          seen.add(key);
          edges.push({ source: ids[i], target: ids[j], type: 'coauthor', weight: 1 });
        }
      }
    }
  });

  // ── Content-similarity edges (field-agnostic citation proxy) ─────────────
  // Pre-compute keyword sets so we don't re-tokenise for every pair.
  const kwSets: Map<string, Set<string>> = new Map(
    papers.map(p => [
      p.id,
      new Set(keywords(`${p.title} ${p.abstract}`)),
    ])
  );

  // Only compare papers within ±4 years of each other — papers can't cite
  // future work, and very old papers rarely discuss the same concepts.
  // Cap at top-150 papers to keep O(n²) manageable in the browser.
  const pool = papers.slice(0, 150);

  for (let i = 0; i < pool.length; i++) {
    for (let j = i + 1; j < pool.length; j++) {
      const pi = pool[i];
      const pj = pool[j];

      if (Math.abs(pi.year - pj.year) > 4) continue;

      const sim = jaccard(kwSets.get(pi.id)!, kwSets.get(pj.id)!);
      if (sim < 0.12) continue;

      const key = [pi.id, pj.id].sort().join('|');
      if (!seen.has(key)) {
        seen.add(key);
        edges.push({ source: pi.id, target: pj.id, type: 'citation', weight: 2 });
      }
    }
  }

  // ── Compute per-node degree ──────────────────────────────────────────────
  const deg: Record<string, number> = {};
  edges.forEach(e => {
    deg[e.source] = (deg[e.source] ?? 0) + 1;
    deg[e.target] = (deg[e.target] ?? 0) + 1;
  });
  papers.forEach(p => { p.degree = deg[p.id] ?? 0; });

  return edges;
}

// ── Trend analyser ────────────────────────────────────────────────────────────

/**
 * Extract the most frequently occurring meaningful words across the entire
 * corpus. These become the trend-chart series.
 *
 * This replaces the old hardcoded list of ML/NLP terms so the chart is
 * meaningful for any field — medical, social science, economics, history, etc.
 */
function extractCorpusTerms(papers: Paper[], topic: string, n = 10): string[] {
  // Always include significant words from the topic query itself
  const topicTerms = topic
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 3 && !STOP_WORDS.has(w));

  // Count word frequency across all titles + abstracts
  const freq: Record<string, number> = {};
  papers.forEach(p => {
    const words = keywords(`${p.title} ${p.abstract}`, 20);
    words.forEach(w => { freq[w] = (freq[w] ?? 0) + 1; });
  });

  // Sort by frequency, take top candidates, prepend topic terms
  const topWords = Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .map(([w]) => w)
    .filter(w => !topicTerms.includes(w))   // don't duplicate topic words
    .slice(0, n + topicTerms.length);        // grab extras in case of overlap

  return [...new Set([...topicTerms, ...topWords])].slice(0, n);
}

/**
 * Count how often each extracted term appears in paper titles + abstracts,
 * grouped by publication year.
 *
 * Returns only terms that appear at least once so empty series are not shown.
 */
export function computeTrends(papers: Paper[], topic: string): TrendSeries {
  const allTerms = extractCorpusTerms(papers, topic);

  const years = [...new Set(
    papers.map(p => p.year).filter(y => y >= 2012 && y <= 2025)
  )].sort((a, b) => a - b);

  const series: Record<string, Record<number, number>> = {};

  allTerms.forEach(term => {
    const counts: Record<number, number> = {};
    years.forEach(y => {
      counts[y] = papers.filter(p =>
        p.year === y &&
        (`${p.title} ${p.abstract}`).toLowerCase().includes(term)
      ).length;
    });
    if (Object.values(counts).some(v => v > 0)) {
      series[term] = counts;
    }
  });

  return { years, series };
}