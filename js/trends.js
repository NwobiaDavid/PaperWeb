/**
 * trends.js
 * ─────────
 * Renders the "Keyword Trends" tab: a multi-series line chart of term
 * frequency per year and a bar chart of papers per year.
 *
 * Depends on: config.js, state.js, utils.js
 * External:   Chart.js 4 (loaded via CDN in index.html)
 */

/** Shared Chart.js axis / grid style options. */
const CHART_SCALE_DEFAULTS = {
  grid:  { color: 'rgba(255,255,255,0.05)' },
  ticks: { color: '#686660', font: { size: 12 } },
};

/**
 * Build (or rebuild) both charts in the Trends panel.
 * Reads DATA from State.
 */
function renderTrends() {
  document.getElementById('trends-empty').style.display = 'none';
  document.getElementById('trends-content').style.display = 'block';

  const { years, series } = State.DATA.trends;
  const terms       = Object.keys(series);
  const activeTerms = new Set(terms.slice(0, 6));  // default: first 6 visible

  // Update subtitle
  document.getElementById('trend-desc').textContent =
    `How key terms from "${State.DATA.meta.topic}" appear per year`;

  // ── Legend pills ────────────────────────────────────────────────────────────
  const legEl = document.getElementById('trend-legend');
  legEl.innerHTML = terms.map((term, i) => `
    <span class="leg-tag text-xs flex items-center gap-1.5 px-2.5 py-0.5 rounded-full
                 border border-[var(--border)] text-[var(--muted)] cursor-pointer transition-all
                 ${activeTerms.has(term) ? 'active' : ''}"
          data-term="${term}">
      <span class="w-2 h-2 rounded-sm flex-shrink-0"
            style="background:${COLORS[i % COLORS.length]}"></span>
      ${term}
    </span>`
  ).join('');

  // Toggle dataset visibility when a legend pill is clicked
  legEl.querySelectorAll('.leg-tag').forEach(el => {
    el.addEventListener('click', () => {
      const term = el.dataset.term;
      if (activeTerms.has(term)) {
        activeTerms.delete(term);
      } else {
        activeTerms.add(term);
      }
      el.classList.toggle('active');
      State.trendChart.data.datasets.forEach(ds => {
        ds.hidden = !activeTerms.has(ds.label);
      });
      State.trendChart.update();
    });
  });

  // Destroy previous instances to avoid canvas conflicts
  if (State.trendChart) { State.trendChart.destroy(); State.trendChart = null; }
  if (State.yearChart)  { State.yearChart.destroy();  State.yearChart  = null; }

  // ── Keyword frequency line chart ────────────────────────────────────────────
  State.trendChart = new Chart(
    document.getElementById('trend-chart').getContext('2d'),
    {
      type: 'line',
      data: {
        labels: years.map(String),
        datasets: terms.map((term, i) => ({
          label:           term,
          data:            years.map(y => series[term][y] || 0),
          borderColor:     COLORS[i % COLORS.length],
          backgroundColor: 'transparent',
          borderWidth:     2,
          pointRadius:     3,
          tension:         0.4,
          hidden:          !activeTerms.has(term),
        })),
      },
      options: {
        responsive:          true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: CHART_SCALE_DEFAULTS,
          y: { ...CHART_SCALE_DEFAULTS, beginAtZero: true },
        },
      },
    }
  );

  // ── Publication volume bar chart ────────────────────────────────────────────
  const yearCounts = {};
  State.DATA.nodes.forEach(n => {
    yearCounts[n.year] = (yearCounts[n.year] || 0) + 1;
  });
  const sortedYears = Object.keys(yearCounts).sort();

  State.yearChart = new Chart(
    document.getElementById('year-chart').getContext('2d'),
    {
      type: 'bar',
      data: {
        labels: sortedYears,
        datasets: [{
          label: 'Papers',
          data:  sortedYears.map(y => yearCounts[y]),
          backgroundColor: sortedYears.map(
            (_, i) => `hsla(${200 + i * 7}, 70%, 60%, 0.7)`
          ),
          borderRadius: 4,
        }],
      },
      options: {
        responsive:          true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: CHART_SCALE_DEFAULTS,
          y: { ...CHART_SCALE_DEFAULTS, beginAtZero: true },
        },
      },
    }
  );
}