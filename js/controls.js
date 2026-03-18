/**
 * controls.js
 * ───────────
 * Wires up all persistent UI event listeners:
 *   - Tab switcher
 *   - Edge-type filter pills
 *   - Year-range dual sliders
 *   - Sidebar text filter
 *   - Enter key on topic input
 *
 * Call initControls() once after the DOM is ready.
 *
 * Depends on: state.js, papers.js, graph.js
 */

function initControls() {

  // ── Tab switcher ────────────────────────────────────────────────────────────
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(`${tab.dataset.tab}-panel`).classList.add('active');
    });
  });

  // ── Edge-type filter pills ──────────────────────────────────────────────────
  document.querySelectorAll('.pill[data-filter]').forEach(pill => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('.pill[data-filter]').forEach(p =>
        p.classList.remove('active')
      );
      pill.classList.add('active');
      State.activeEdgeFilter = pill.dataset.filter;
      if (State.DATA) renderGraph();
    });
  });

  // ── Year-range dual sliders ─────────────────────────────────────────────────
  const yMin   = document.getElementById('year-min');
  const yMax   = document.getElementById('year-max');
  const yLabel = document.getElementById('year-label');

  function onYearChange() {
    let mn = parseInt(yMin.value);
    let mx = parseInt(yMax.value);

    // Ensure min ≤ max (swap handles if user crosses them)
    if (mn > mx) {
      yMin.value = mx;
      yMax.value = mn;
      [mn, mx]   = [mx, mn];
    }

    yLabel.textContent = `${mn}–${mx}`;

    if (State.DATA) {
      buildPaperList(State.DATA.nodes.filter(n => n.year >= mn && n.year <= mx));
    }
  }

  yMin.addEventListener('input', onYearChange);
  yMax.addEventListener('input', onYearChange);

  // ── Sidebar text search ────────────────────────────────────────────────────
  document.getElementById('filter-input').addEventListener('input', e => {
    const q = e.target.value.toLowerCase();
    if (!State.DATA) return;

    if (!q) {
      buildPaperList(State.DATA.nodes);
      return;
    }

    buildPaperList(
      State.DATA.nodes.filter(n =>
        n.title.toLowerCase().includes(q) ||
        (n.authors || []).join(' ').toLowerCase().includes(q)
      )
    );
  });

  // ── Enter key on topic input ────────────────────────────────────────────────
  document.getElementById('topic-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') startSearch();
  });
}