/**
 * papers.js
 * ─────────
 * Renders the sidebar paper list, stat cards, and the "Top Papers" tab.
 *
 * Depends on: state.js, utils.js
 */

// ── Stats ─────────────────────────────────────────────────────────────────────

/**
 * Populate the four stat cards in the sidebar.
 * Reads DATA from State.
 */
function buildStats() {
  const nodes  = State.DATA.nodes;
  const edges  = State.DATA.edges;
  const topDeg = Math.max(...nodes.map(n => n.degree || 0));
  const avgDeg = edges.length
    ? (edges.length * 2 / nodes.length).toFixed(1)
    : '0.0';

  document.getElementById('stat-nodes').textContent = nodes.length;
  document.getElementById('stat-edges').textContent = edges.length;
  document.getElementById('stat-top').textContent   = topDeg;
  document.getElementById('stat-deg').textContent   = avgDeg;
}

// ── Sidebar paper list ────────────────────────────────────────────────────────

/**
 * Render the scrollable paper list in the sidebar.
 * Sorts papers by degree descending.
 *
 * @param {object[]} nodes  Array of node/paper objects to display.
 */
function buildPaperList(nodes) {
  const list = document.getElementById('paper-list');

  if (!nodes.length) {
    list.innerHTML = `
      <div class="flex flex-col items-center justify-center gap-2.5 text-[var(--muted)] px-5 py-10">
        <span class="text-4xl opacity-35">🔎</span>
        <p class="text-sm">No matching papers</p>
      </div>`;
    return;
  }

  const sorted = [...nodes].sort((a, b) => (b.degree || 0) - (a.degree || 0));

  list.innerHTML = sorted.map(n => {
    // Escape the ID so it can safely appear inside an onclick attribute
    const safeId = n.id.replace(/'/g, "\\'").replace(/"/g, '&quot;');
    const authors = (n.authors || []).slice(0, 2).join(', ');

    return `
      <div class="paper-item px-3.5 py-3 border-b border-[rgba(255,255,255,0.07)]
                  cursor-pointer transition-colors"
           data-id="${n.id}"
           onclick="selectPaper('${safeId}')">
        <div class="text-[13px] font-medium leading-snug mb-1">${esc(n.title)}</div>
        <div class="text-xs text-[var(--muted)] flex gap-2 flex-wrap items-center">
          <span>${n.year || '?'}</span>
          <span>${authors}</span>
          <span class="ml-auto text-[11px] font-mono px-1.5 py-0.5 rounded
                       bg-[rgba(79,142,247,.1)] text-[var(--accent)]
                       border border-[rgba(79,142,247,.2)]">
            ${n.degree}🔗
          </span>
        </div>
      </div>`;
  }).join('');
}

/**
 * Highlight a paper in the sidebar list and trigger graph node highlight.
 * @param {string} id  arXiv ID.
 */
function selectPaper(id) {
  document.querySelectorAll('.paper-item').forEach(el =>
    el.classList.toggle('selected', el.dataset.id === id)
  );
  highlightNode(id);
}

// ── Top Papers tab ────────────────────────────────────────────────────────────

/**
 * Populate the Top Papers panel with the top 30 nodes by degree.
 * Reads DATA from State.
 */
function renderTopPapers() {
  document.getElementById('top-empty').style.display = 'none';
  const list = document.getElementById('top-list');
  list.style.display = 'block';

  const sorted = [...State.DATA.nodes]
    .sort((a, b) => (b.degree || 0) - (a.degree || 0))
    .slice(0, 30);

  list.innerHTML = sorted.map((p, i) => {
    const rank    = String(i + 1).padStart(2, '0');
    const authors = (p.authors || []).slice(0, 3).join(', ');
    const cats    = (p.categories || []).slice(0, 2).join(', ');

    return `
      <div class="top-paper bg-[var(--bg2)] border border-[rgba(255,255,255,0.07)]
                  rounded-xl p-4 mb-2.5 flex gap-3.5 items-start transition-colors cursor-default">
        <div class="text-xl font-bold font-mono text-[rgba(255,255,255,0.13)]
                    min-w-[28px] leading-none">${rank}</div>
        <div class="flex-1">
          <h4 class="text-sm font-medium leading-snug mb-1.5">${esc(p.title)}</h4>
          <div class="text-xs text-[var(--muted)] flex gap-3 flex-wrap">
            <span>📅 ${p.year || '?'}</span>
            <span>👥 ${authors}</span>
            <span>📂 ${cats}</span>
          </div>
          <a href="${p.url}" target="_blank"
             class="mt-1.5 inline-block text-xs text-[var(--accent)] no-underline hover:opacity-80">
            arXiv ↗
          </a>
        </div>
        <div class="ml-auto text-right font-mono flex-shrink-0">
          <div class="text-lg font-bold text-[var(--accent)]">${p.degree || 0}</div>
          <div class="text-[10px] text-[var(--muted)] mt-0.5">connections</div>
        </div>
      </div>`;
  }).join('');
}