/**
 * app.js
 * ──────
 * Top-level application orchestrator.
 *
 * Responsibilities:
 *   - startSearch()  — fetch → build network → compute trends → store in State
 *   - quickSearch()  — shortcut to pre-fill topic and search
 *   - renderAll()    — call every render function after data is ready
 *   - init()         — boot sequence: wire controls, trigger first search
 *
 * Depends on: config.js, state.js, utils.js, api.js,
 *             network.js, graph.js, trends.js, papers.js, controls.js
 */

// ── Search orchestration ──────────────────────────────────────────────────────

/**
 * Run a full search pipeline for the current topic input value.
 *
 * Pipeline:
 *   1. fetchArxiv      → raw paper array
 *   2. buildNetwork    → edge list (mutates paper.degree in-place)
 *   3. computeTrends   → keyword frequency series
 *   4. Store in State.DATA
 *   5. renderAll()
 */
async function startSearch() {
  const topic = document.getElementById('topic-input').value.trim();
  if (!topic) return;

  const btn = document.getElementById('search-btn');
  btn.disabled = true;
  showLoading(true);

  try {
    // Step 1 — fetch papers from arXiv
    const papers = await fetchArxiv(topic, DEFAULT_MAX_RESULTS);

    if (!papers.length) {
      alert('No papers found. Try different keywords.');
      showLoading(false);
      btn.disabled = false;
      return;
    }

    // Step 2 — build co-authorship / citation network
    setLoadingText(
      `Building network from ${papers.length} papers…`,
      'Mapping co-authorship and citation links'
    );
    await sleep(80);
    const edges = buildNetwork(papers);

    // Step 3 — compute keyword trends
    setLoadingText('Computing keyword trends…', 'Analyzing term frequency 2012–2025');
    await sleep(80);
    const trends = computeTrends(papers, topic);

    // Step 4 — store
    State.DATA = {
      meta: {
        node_count: papers.length,
        edge_count: edges.length,
        generated:  new Date().toISOString(),
        topic,
      },
      nodes:  papers,
      edges,
      trends,
    };

    showLoading(false);
    btn.disabled = false;

    // Step 5 — render everything
    renderAll();

  } catch (err) {
    showLoading(false);
    btn.disabled = false;
    alert(`Error: ${err.message}\n\nCheck your internet connection and try again.`);
  }
}

/**
 * Pre-fill the topic input with a preset query, then run a search.
 * @param {string} topic
 */
function quickSearch(topic) {
  document.getElementById('topic-input').value = topic;
  startSearch();
}

// ── Render orchestration ──────────────────────────────────────────────────────

/**
 * Update all UI surfaces after State.DATA has been populated.
 */
function renderAll() {
  const { meta, nodes, edges } = State.DATA;

  // Header badges + subtitle
  document.getElementById('topic-label').textContent =
    `"${meta.topic}" — ${nodes.length} papers fetched`;
  document.getElementById('node-badge').textContent = `${nodes.length} papers`;
  document.getElementById('edge-badge').textContent = `${edges.length} edges`;

  // Delegate to individual render modules
  buildStats();
  buildPaperList(nodes);
  renderGraph();
  renderTrends();
  renderTopPapers();
}

// ── Boot ──────────────────────────────────────────────────────────────────────

/**
 * Application entry point. Called once when the DOM is ready.
 */
function init() {
  initControls();
  startSearch();   // auto-run the default topic
}