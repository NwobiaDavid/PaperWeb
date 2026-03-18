/**
 * graph.js
 * ────────
 * D3 force-directed graph: renders nodes and edges, handles zoom/pan,
 * drag interactions, tooltip display, and node highlighting.
 *
 * Depends on: config.js, state.js, utils.js
 * External:   D3 v7 (loaded via CDN in index.html)
 */

// ── Node helpers ──────────────────────────────────────────────────────────────

/** Radius of a node based on its degree (connection count). */
function nodeR(n) {
  return 4 + Math.sqrt(n.degree || 0) * 2.4;
}

/**
 * Fill colour for a node, scaled relative to the max degree in the dataset.
 * @param {object} n  Node datum.
 * @param {number} maxDeg  Maximum degree in the current render batch.
 */
function nodeColor(n, maxDeg) {
  const ratio = (n.degree || 0) / maxDeg;
  if (ratio > 0.6) return '#f5a623';   // warn  — highly connected hub
  if (ratio > 0.3) return '#4f8ef7';   // accent
  return '#22c999';                     // accent2 — peripheral node
}

// ── Tooltip ───────────────────────────────────────────────────────────────────

/**
 * Position and populate the hover tooltip.
 * @param {MouseEvent} event
 * @param {object}     d      D3 node datum.
 */
function showTooltip(event, d) {
  const tt   = document.getElementById('tooltip');
  const authors = (d.authors || []).slice(0, 3).join(', ');

  tt.innerHTML = `
    <h4>${esc(d.title)}</h4>
    <div class="tm">📅 ${d.year || '?'} &nbsp;|&nbsp; 🔗 ${d.degree} connections</div>
    <div class="tm">👥 ${authors}</div>
    <a href="${d.url}" target="_blank">Open on arXiv ↗</a>`;

  const rect = document.getElementById('graph-panel').getBoundingClientRect();
  let x = event.clientX - rect.left + 14;
  let y = event.clientY - rect.top  - 10;
  if (x + 285 > rect.width)  x -= 300;
  if (y + 140 > rect.height) y -= 130;

  tt.style.left    = `${x}px`;
  tt.style.top     = `${y}px`;
  tt.style.display = 'block';
}

// ── Highlight ─────────────────────────────────────────────────────────────────

/**
 * Temporarily highlight a single node and its edges, then restore.
 * @param {string} id  arXiv ID of the node to highlight.
 */
function highlightNode(id) {
  d3.selectAll('.node-circle')
    .attr('opacity', d => d.id === id ? 1 : 0.2)
    .attr('r',       d => d.id === id ? nodeR(d) * 1.6 : nodeR(d));

  d3.selectAll('.graph-link')
    .attr('opacity', l =>
      (l.source.id === id || l.target.id === id) ? 0.8 : 0.03
    );

  setTimeout(() => {
    d3.selectAll('.node-circle')
      .attr('opacity', 0.85)
      .attr('r', d => nodeR(d));
    d3.selectAll('.graph-link').attr('opacity', null);
  }, 3000);
}

// ── Main render ───────────────────────────────────────────────────────────────

/**
 * Build (or rebuild) the D3 force simulation and SVG graph.
 * Reads DATA and activeEdgeFilter from State.
 */
function renderGraph() {
  // Show graph chrome, hide placeholder
  document.getElementById('graph-empty').style.display = 'none';
  const svgEl = document.getElementById('graph-svg');
  svgEl.style.display = 'block';
  document.getElementById('graph-controls').style.display = 'flex';
  document.getElementById('graph-legend').style.display   = 'flex';

  // Stop any previous simulation
  if (State.simulation) State.simulation.stop();

  const svg = d3.select('#graph-svg');
  svg.selectAll('*').remove();

  const panel = document.getElementById('graph-panel');
  const W = panel.clientWidth  || 900;
  const H = panel.clientHeight || 600;
  svg.attr('viewBox', `0 0 ${W} ${H}`);

  // Zoom/pan group
  const g    = svg.append('g');
  const zoom = d3.zoom()
    .scaleExtent([0.05, 8])
    .on('zoom', e => g.attr('transform', e.transform));
  svg.call(zoom);
  svg._zoom = zoom;  // store reference for zoom-button handlers

  // Prepare nodes + filtered edges
  const allNodes = State.DATA.nodes.map(d => ({ ...d }));
  let   edges    = State.DATA.edges
    .filter(e =>
      State.activeEdgeFilter === 'all' || e.type === State.activeEdgeFilter
    )
    .map(e => ({ ...e }));

  // Cap render to top-180 nodes by degree for performance
  const topNodes = [...allNodes]
    .sort((a, b) => (b.degree || 0) - (a.degree || 0))
    .slice(0, 180);
  const nodeIds = new Set(topNodes.map(n => n.id));

  edges = edges
    .filter(e =>
      nodeIds.has(e.source?.id || e.source) &&
      nodeIds.has(e.target?.id || e.target)
    )
    .slice(0, 600);

  const maxDeg = Math.max(...topNodes.map(n => n.degree || 0), 1);

  // ── Edges ────────────────────────────────────────────────────────────────
  const link = g.append('g')
    .selectAll('line')
    .data(edges)
    .enter().append('line')
      .attr('class', 'graph-link')
      .attr('stroke', d =>
        d.type === 'citation'
          ? 'rgba(79,142,247,0.22)'
          : 'rgba(34,201,153,0.14)'
      )
      .attr('stroke-width', d => d.type === 'citation' ? 1 : 0.5);

  // ── Nodes ────────────────────────────────────────────────────────────────
  const node = g.append('g')
    .selectAll('circle')
    .data(topNodes)
    .enter().append('circle')
      .attr('class',        'node-circle')
      .attr('r',            nodeR)
      .attr('fill',         d => nodeColor(d, maxDeg))
      .attr('opacity',      0.85)
      .attr('stroke',       '#0a0b0e')
      .attr('stroke-width', 0.5)
      .attr('cursor',       'pointer')
      .on('mouseover', showTooltip)
      .on('mouseout',  () => { document.getElementById('tooltip').style.display = 'none'; })
      .on('click',     (_, d) => selectPaper(d.id))
      .call(
        d3.drag()
          .on('start', (ev, d) => {
            if (!ev.active) State.simulation.alphaTarget(0.3).restart();
            d.fx = d.x; d.fy = d.y;
          })
          .on('drag',  (ev, d) => { d.fx = ev.x; d.fy = ev.y; })
          .on('end',   (ev, d) => {
            if (!ev.active) State.simulation.alphaTarget(0);
            d.fx = null; d.fy = null;
          })
      );

  // ── Force simulation ─────────────────────────────────────────────────────
  State.simulation = d3.forceSimulation(topNodes)
    .force('link',      d3.forceLink(edges).id(d => d.id).distance(50).strength(0.25))
    .force('charge',    d3.forceManyBody().strength(-130).distanceMax(320))
    .force('center',    d3.forceCenter(W / 2, H / 2))
    .force('collision', d3.forceCollide().radius(d => nodeR(d) + 2))
    .on('tick', () => {
      link
        .attr('x1', d => d.source.x).attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x).attr('y2', d => d.target.y);
      node
        .attr('cx', d => d.x)
        .attr('cy', d => d.y);
    });

  // ── Zoom buttons ─────────────────────────────────────────────────────────
  document.getElementById('zoom-in').onclick    = () => svg.transition().call(zoom.scaleBy, 1.4);
  document.getElementById('zoom-out').onclick   = () => svg.transition().call(zoom.scaleBy, 0.7);
  document.getElementById('zoom-reset').onclick = () => svg.transition().call(zoom.transform, d3.zoomIdentity);
}