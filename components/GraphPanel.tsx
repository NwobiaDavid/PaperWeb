// components/GraphPanel.tsx
'use client';

import { useEffect, useRef, useCallback } from 'react';
import type * as D3 from 'd3';
import type { AppData, EdgeFilter } from '@/lib/types';

interface Props {
  data:        AppData | null;
  edgeFilter:  EdgeFilter;
  highlightId: string | null;
}

/** D3 SimulationNodeDatum extended with our paper fields. */
interface SimNode extends D3.SimulationNodeDatum {
  id:         string;
  title:      string;
  abstract:   string;
  year:       number;
  authors:    string[];
  categories: string[];
  citations:  number;
  degree:     number;
  url:        string;
}

interface SimEdge extends D3.SimulationLinkDatum<SimNode> {
  type:   'citation' | 'coauthor';
  weight: number;
}

function nodeR(degree: number) { return 4 + Math.sqrt(degree || 0) * 2.4; }

function nodeColor(degree: number, maxDeg: number): string {
  const r = degree / maxDeg;
  if (r > 0.6) return '#f5a623';
  if (r > 0.3) return '#4f8ef7';
  return '#22c999';
}

export default function GraphPanel({ data, edgeFilter, highlightId }: Props) {
  const svgRef        = useRef<SVGSVGElement>(null);
  const simRef        = useRef<D3.Simulation<SimNode, SimEdge> | null>(null);
  const tooltipRef    = useRef<HTMLDivElement>(null);
  const containerRef  = useRef<HTMLDivElement>(null);
  // Grace-period timer — cleared when the cursor re-enters either the node
  // or the tooltip itself, so the tooltip stays open while the user moves
  // between them.
  const hideTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showTooltip = useCallback((event: MouseEvent, d: SimNode) => {
    if (!tooltipRef.current || !containerRef.current) return;

    // Cancel any pending hide
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }

    const tt      = tooltipRef.current;
    const authors = d.authors.slice(0, 3).join(', ');

    tt.innerHTML = `
      <div style="font-size:13px;font-weight:600;margin-bottom:5px;line-height:1.4">
        ${d.title}
      </div>
      <div style="font-size:12px;color:#686660;margin-bottom:3px">
        📅 ${d.year || '?'} &nbsp;|&nbsp; 🔗 ${d.degree} connections
      </div>
      <div style="font-size:12px;color:#686660;margin-bottom:3px">
        👥 ${authors}
      </div>
      <a href="${d.url}" target="_blank" rel="noreferrer"
         style="display:inline-block;margin-top:7px;font-size:12px;color:#4f8ef7;
                text-decoration:none;padding:3px 9px;border-radius:6px;
                border:1px solid rgba(79,142,247,.3);background:rgba(79,142,247,.08)">
        Open on arXiv ↗
      </a>`;

    // Position relative to the container so it stays inside the panel
    const rect = containerRef.current.getBoundingClientRect();
    let x = event.clientX - rect.left + 14;
    let y = event.clientY - rect.top  - 10;
    if (x + 290 > rect.width)  x -= 305;
    if (y + 160 > rect.height) y -= 150;

    tt.style.left    = `${x}px`;
    tt.style.top     = `${y}px`;
    tt.style.display = 'block';
  }, []);

  const scheduleHide = useCallback(() => {
    // Wait 150 ms before hiding — enough time for the cursor to travel from
    // a circle edge to the tooltip without triggering a flicker.
    hideTimerRef.current = setTimeout(() => {
      if (tooltipRef.current) tooltipRef.current.style.display = 'none';
    }, 150);
  }, []);

  const cancelHide = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  // ── Build / rebuild D3 simulation ──────────────────────────────────────────
  useEffect(() => {
    if (!data || !svgRef.current || !containerRef.current) return;

    import('d3').then((d3: typeof D3) => {
      if (!svgRef.current || !containerRef.current) return;
      if (simRef.current) simRef.current.stop();

      const svg = d3.select<SVGSVGElement, unknown>(svgRef.current);
      svg.selectAll('*').remove();

      const W = containerRef.current.clientWidth  || 900;
      const H = containerRef.current.clientHeight || 600;
      svg.attr('viewBox', `0 0 ${W} ${H}`);

      const g    = svg.append('g');
      const zoom = d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.05, 8])
        .on('zoom', (e: D3.D3ZoomEvent<SVGSVGElement, unknown>) =>
          g.attr('transform', e.transform.toString())
        );
      svg.call(zoom);

      const el = svgRef.current as SVGSVGElement & {
        _zoomIn?:    () => void;
        _zoomOut?:   () => void;
        _zoomReset?: () => void;
      };
      el._zoomIn    = () => svg.transition().call(zoom.scaleBy,  1.4);
      el._zoomOut   = () => svg.transition().call(zoom.scaleBy,  0.7);
      el._zoomReset = () => svg.transition().call(zoom.transform, d3.zoomIdentity);

      const topNodes: SimNode[] = [...data.nodes]
        .sort((a, b) => (b.degree ?? 0) - (a.degree ?? 0))
        .slice(0, 180)
        .map(n => ({ ...n }));

      const nodeIds = new Set(topNodes.map(n => n.id));

      const edges: SimEdge[] = data.edges
        .filter(e => edgeFilter === 'all' || e.type === edgeFilter)
        .filter(e => {
          const s = typeof e.source === 'string' ? e.source : (e.source as SimNode).id;
          const t = typeof e.target === 'string' ? e.target : (e.target as SimNode).id;
          return nodeIds.has(s) && nodeIds.has(t);
        })
        .slice(0, 600)
        .map(e => ({ ...e } as SimEdge));

      const maxDeg = Math.max(...topNodes.map(n => n.degree ?? 0), 1);

      // ── Edges ──────────────────────────────────────────────────────────────
      const link = g.append('g')
        .selectAll<SVGLineElement, SimEdge>('line')
        .data(edges)
        .enter().append('line')
          .attr('class',        'graph-link')
          .attr('stroke',       d => d.type === 'citation' ? 'rgba(79,142,247,0.22)' : 'rgba(34,201,153,0.14)')
          .attr('stroke-width', d => d.type === 'citation' ? 1 : 0.5);

      // ── Nodes ──────────────────────────────────────────────────────────────
      const node = g.append('g')
        .selectAll<SVGCircleElement, SimNode>('circle')
        .data(topNodes)
        .enter().append('circle')
          .attr('class',        'node-circle')
          .attr('r',            d => nodeR(d.degree))
          .attr('fill',         d => nodeColor(d.degree, maxDeg))
          .attr('opacity',      0.85)
          .attr('stroke',       '#0a0b0e')
          .attr('stroke-width', 0.5)
          .attr('cursor',       'pointer')
          // Show tooltip immediately on enter; cancel any pending hide
          .on('mouseover', (event: MouseEvent, d: SimNode) => {
            cancelHide();
            showTooltip(event, d);
          })
          // Schedule hide on leave — tooltip's own mouseenter will cancel it
          .on('mouseout', scheduleHide)
          .call(
            d3.drag<SVGCircleElement, SimNode>()
              .on('start', (ev: D3.D3DragEvent<SVGCircleElement, SimNode, SimNode>, d) => {
                if (!ev.active) simRef.current?.alphaTarget(0.3).restart();
                d.fx = d.x;
                d.fy = d.y;
              })
              .on('drag', (ev: D3.D3DragEvent<SVGCircleElement, SimNode, SimNode>, d) => {
                d.fx = ev.x;
                d.fy = ev.y;
              })
              .on('end', (ev: D3.D3DragEvent<SVGCircleElement, SimNode, SimNode>, d) => {
                if (!ev.active) simRef.current?.alphaTarget(0);
                d.fx = null;
                d.fy = null;
              })
          );

      // ── Force simulation ───────────────────────────────────────────────────
      simRef.current = d3.forceSimulation<SimNode, SimEdge>(topNodes)
        .force('link',
          d3.forceLink<SimNode, SimEdge>(edges)
            .id(d => d.id)
            .distance(50)
            .strength(0.25)
        )
        .force('charge',    d3.forceManyBody<SimNode>().strength(-130).distanceMax(320))
        .force('center',    d3.forceCenter<SimNode>(W / 2, H / 2))
        .force('collision', d3.forceCollide<SimNode>().radius(d => nodeR(d.degree) + 2))
        .on('tick', () => {
          link
            .attr('x1', d => (d.source as SimNode).x ?? 0)
            .attr('y1', d => (d.source as SimNode).y ?? 0)
            .attr('x2', d => (d.target as SimNode).x ?? 0)
            .attr('y2', d => (d.target as SimNode).y ?? 0);
          node
            .attr('cx', d => d.x ?? 0)
            .attr('cy', d => d.y ?? 0);
        });
    });

    return () => {
      simRef.current?.stop();
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [data, edgeFilter, showTooltip, scheduleHide, cancelHide]);

  // ── Highlight a single node when selectedId changes ────────────────────────
  useEffect(() => {
    if (!highlightId) return;
    import('d3').then((d3: typeof D3) => {
      d3.selectAll<SVGCircleElement, SimNode>('.node-circle')
        .attr('opacity', d => d.id === highlightId ? 1 : 0.2)
        .attr('r',       d => d.id === highlightId ? nodeR(d.degree) * 1.6 : nodeR(d.degree));

      d3.selectAll<SVGLineElement, SimEdge>('.graph-link')
        .attr('opacity', d => {
          const s = typeof d.source === 'string' ? d.source : (d.source as SimNode).id;
          const t = typeof d.target === 'string' ? d.target : (d.target as SimNode).id;
          return s === highlightId || t === highlightId ? 0.8 : 0.03;
        });

      setTimeout(() => {
        d3.selectAll<SVGCircleElement, SimNode>('.node-circle')
          .attr('opacity', 0.85)
          .attr('r',       d => nodeR(d.degree));
        d3.selectAll<SVGLineElement, SimEdge>('.graph-link')
          .attr('opacity', null);
      }, 3000);
    });
  }, [highlightId]);

  // ── Zoom button handlers ───────────────────────────────────────────────────
  const zoomIn = useCallback(() => {
    (svgRef.current as SVGSVGElement & { _zoomIn?: () => void })?._zoomIn?.();
  }, []);
  const zoomOut = useCallback(() => {
    (svgRef.current as SVGSVGElement & { _zoomOut?: () => void })?._zoomOut?.();
  }, []);
  const zoomReset = useCallback(() => {
    (svgRef.current as SVGSVGElement & { _zoomReset?: () => void })?._zoomReset?.();
  }, []);

  const ctrlBtn = [
    'w-8 h-8 rounded-lg',
    'bg-[#111318] border border-white/[0.13]',
    'text-[#e8e6e0] text-sm cursor-pointer',
    'flex items-center justify-center',
    'hover:bg-[#181c24] transition-colors',
  ].join(' ');

  return (
    <div ref={containerRef} className="relative flex-1 overflow-hidden">

      {/* Empty state */}
      {!data && (
        <div className="flex flex-col items-center justify-center h-full gap-2.5 text-[#686660]">
          <span className="text-4xl opacity-35">🕸</span>
          <p className="text-sm">Enter a topic and click Search</p>
          <small className="text-xs opacity-60">
            Fetches up to 200 real papers from arXiv and maps their network
          </small>
        </div>
      )}

      {/* D3 SVG canvas */}
      <svg
        ref={svgRef}
        className="w-full h-full"
        style={{ display: data ? 'block' : 'none' }}
      />

      {/* Zoom controls */}
      {data && (
        <div className="absolute top-3 right-3 flex flex-col gap-1.5">
          <button onClick={zoomIn}    className={ctrlBtn}>+</button>
          <button onClick={zoomOut}   className={ctrlBtn}>−</button>
          <button onClick={zoomReset} className={ctrlBtn}>⊙</button>
        </div>
      )}

      {/*
        Tooltip
        ───────
        Two critical changes vs. the old version:

        1. pointer-events-none is REMOVED — the tooltip must be hoverable so
           that mouseenter/mouseleave on it can cancel/restart the hide timer.

        2. onMouseEnter cancels the pending hide (cursor arrived before the
           150 ms elapsed); onMouseLeave re-schedules it so the tooltip
           disappears once the cursor leaves the tooltip itself.
      */}
      <div
        ref={tooltipRef}
        onMouseEnter={cancelHide}
        onMouseLeave={scheduleHide}
        className="absolute bg-[#111318] border border-white/[0.13]
                   rounded-[10px] p-[11px_13px] text-[13px] max-w-[270px] z-20
                   shadow-[0_8px_24px_rgba(0,0,0,.55)] text-[#e8e6e0]
                   cursor-default"
        style={{ display: 'none' }}
      />

      {/* Legend */}
      {data && (
        <div className="absolute bottom-3.5 left-3.5 bg-[#111318] border border-white/[0.07]
                        rounded-lg px-3 py-2 text-xs flex gap-3.5">
          {[
            { color: '#f5a623', label: 'Highly connected' },
            { color: '#4f8ef7', label: 'Citation' },
            { color: '#22c999', label: 'Co-author' },
          ].map(l => (
            <div key={l.label} className="flex items-center gap-1.5 text-[#686660]">
              <div className="w-2 h-2 rounded-full" style={{ background: l.color }} />
              {l.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}