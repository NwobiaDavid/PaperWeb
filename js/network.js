/**
 * network.js
 * ──────────
 * Pure data-processing: builds the citation/co-authorship edge list from a
 * flat array of papers, and computes keyword frequency trends over time.
 *
 * No DOM interaction. No external dependencies beyond plain JS.
 */

/**
 * Build a list of edges from paper metadata.
 *
 * Two edge types are created:
 *   - coauthor  : papers that share at least one author
 *   - citation  : probabilistic proxy based on shared category + nearby year
 *
 * Also mutates each paper object in-place, adding a `degree` count.
 *
 * @param {object[]} papers  Array of paper objects (mutated in-place).
 * @returns {object[]}       Edge list: [{ source, target, type, weight }, …]
 */
function buildNetwork(papers) {
  const edges = [];
  const seen  = new Set();

  // ── Co-authorship edges ────────────────────────────────────────────────────
  const authorMap = {};
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

  // ── Category-based citation-proxy edges ────────────────────────────────────
  const catMap = {};
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

  // ── Compute per-node degree ────────────────────────────────────────────────
  const deg = {};
  edges.forEach(e => {
    deg[e.source] = (deg[e.source] || 0) + 1;
    deg[e.target] = (deg[e.target] || 0) + 1;
  });
  papers.forEach(p => { p.degree = deg[p.id] || 0; });

  return edges;
}

/**
 * Count how often topic-derived and standard ML/NLP terms appear in paper
 * titles + abstracts, grouped by publication year.
 *
 * @param {object[]} papers
 * @param {string}   topic   The user's search string; drives term extraction.
 * @returns {{ years: number[], series: Record<string, Record<number, number>> }}
 */
function computeTrends(papers, topic) {
  const topicWords = topic.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  const baseTerms  = [
    'deep learning', 'neural network', 'transformer',
    'accuracy', 'dataset', 'model', 'framework',
    'performance', 'optimization', 'prediction',
  ];
  const allTerms = [...new Set([...topicWords, ...baseTerms])].slice(0, 10);

  const years = [...new Set(
    papers.map(p => p.year).filter(y => y >= 2012 && y <= 2025)
  )].sort();

  const series = {};
  allTerms.forEach(term => {
    const counts = {};
    years.forEach(y => {
      counts[y] = papers.filter(p =>
        p.year === y &&
        (p.title.toLowerCase().includes(term) ||
         p.abstract.toLowerCase().includes(term))
      ).length;
    });
    // Only include terms that appear at least once
    if (Object.values(counts).some(v => v > 0)) {
      series[term] = counts;
    }
  });

  return { years, series };
}