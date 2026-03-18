// lib/network.ts
// ─────────────────────────────────────────────────────────────────────────────
// Pure data-processing: builds the citation/co-authorship edge list and
// computes keyword frequency trends over time. No DOM interaction.

import type { Paper, Edge, TrendSeries } from './types';

/**
 * Build a list of edges from paper metadata.
 *
 * Two edge types are created:
 *   - coauthor  : papers that share at least one author
 *   - citation  : probabilistic proxy based on shared category + nearby year
 *
 * Also mutates each paper object in-place, adding a `degree` count.
 */
export function buildNetwork(papers: Paper[]): Edge[] {
  const edges: Edge[] = [];
  const seen = new Set<string>();

  // ── Co-authorship edges ───────────────────────────────────────────────────
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

  // ── Category-based citation-proxy edges ───────────────────────────────────
  const catMap: Record<string, Paper[]> = {};
  papers.forEach(p =>
    p.categories.forEach(c => {
      if (!catMap[c]) catMap[c] = [];
      catMap[c].push(p);
    })
  );

  Object.values(catMap).forEach(group => {
    for (let i = 0; i < group.length; i++) {
      const targets = group
        .filter(q =>
          q.id !== group[i].id &&
          Math.abs(q.year - group[i].year) <= 3 &&
          Math.random() < 0.15
        )
        .slice(0, 3);

      targets.forEach(t => {
        const key = [group[i].id, t.id].sort().join('|');
        if (!seen.has(key)) {
          seen.add(key);
          edges.push({ source: group[i].id, target: t.id, type: 'citation', weight: 2 });
        }
      });
    }
  });

  // ── Compute per-node degree ───────────────────────────────────────────────
  const deg: Record<string, number> = {};
  edges.forEach(e => {
    deg[e.source] = (deg[e.source] ?? 0) + 1;
    deg[e.target] = (deg[e.target] ?? 0) + 1;
  });
  papers.forEach(p => { p.degree = deg[p.id] ?? 0; });

  return edges;
}

/**
 * Count how often topic-derived and standard ML/NLP terms appear in paper
 * titles + abstracts, grouped by publication year.
 */
export function computeTrends(papers: Paper[], topic: string): TrendSeries {
  const topicWords = topic.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  const baseTerms  = [
    'deep learning', 'neural network', 'transformer',
    'accuracy', 'dataset', 'model', 'framework',
    'performance', 'optimization', 'prediction',
  ];
  const allTerms = [...new Set([...topicWords, ...baseTerms])].slice(0, 10);

  const years = [...new Set(
    papers.map(p => p.year).filter(y => y >= 2012 && y <= 2025)
  )].sort((a, b) => a - b);

  const series: Record<string, Record<number, number>> = {};
  allTerms.forEach(term => {
    const counts: Record<number, number> = {};
    years.forEach(y => {
      counts[y] = papers.filter(p =>
        p.year === y &&
        (p.title.toLowerCase().includes(term) ||
         p.abstract.toLowerCase().includes(term))
      ).length;
    });
    if (Object.values(counts).some(v => v > 0)) {
      series[term] = counts;
    }
  });

  return { years, series };
}