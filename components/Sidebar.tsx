// components/Sidebar.tsx
'use client';

import { useState, useMemo } from 'react';
import type { AppData, EdgeFilter, Paper } from '@/lib/types';
import PaperList from './PaperList';

interface Props {
  data:          AppData | null;
  edgeFilter:    EdgeFilter;
  onEdgeFilter:  (f: EdgeFilter) => void;
  selectedId:    string | null;
  onSelectPaper: (id: string) => void;
}

const EDGE_FILTERS: { label: string; value: EdgeFilter }[] = [
  { label: 'All',        value: 'all' },
  { label: 'Citations',  value: 'citation' },
  { label: 'Co-authors', value: 'coauthor' },
];

export default function Sidebar({
  data, edgeFilter, onEdgeFilter, selectedId, onSelectPaper,
}: Props) {
  const [filterText, setFilterText] = useState('');
  const [yearMin,    setYearMin]    = useState(2010);
  const [yearMax,    setYearMax]    = useState(2025);

  const topDeg = useMemo(() =>
    data ? Math.max(...data.nodes.map(n => n.degree ?? 0)) : 0
  , [data]);

  const avgDeg = useMemo(() =>
    data && data.edges.length
      ? (data.edges.length * 2 / data.nodes.length).toFixed(1)
      : '0.0'
  , [data]);

  const filteredPapers: Paper[] = useMemo(() => {
    if (!data) return [];
    const q = filterText.toLowerCase();
    return data.nodes.filter(n => {
      const inYear = n.year >= yearMin && n.year <= yearMax;
      if (!q) return inYear;
      return inYear && (
        n.title.toLowerCase().includes(q) ||
        n.authors.join(' ').toLowerCase().includes(q)
      );
    });
  }, [data, filterText, yearMin, yearMax]);

  return (
    /*
     * FIX 1 — `w-0 min-w-full` + `overflow-x-hidden`
     * The aside sits in a fixed 272px grid column. Without an explicit width
     * anchor, a flex/grid child can still grow beyond its track if its content
     * is wider. `w-0 min-w-full` collapses intrinsic width to zero and then
     * stretches it back to 100% of the column — nothing can push it wider.
     * `overflow-x-hidden` clips anything that still tries to escape.
     * The outer `overflow-y-auto` is moved to the paper-list div only so the
     * section headers stay fixed while papers scroll independently.
     */
    <aside className="w-0 min-w-full overflow-x-hidden overflow-y-hidden
                      bg-[#111318] border-r border-white/[0.07]
                      flex flex-col">

      {/* Text filter */}
      <div className="px-3.5 py-3 border-b border-white/[0.07] flex-shrink-0">
        <h3 className="text-[11px] tracking-widest uppercase text-[#686660] mb-2">
          Filter results
        </h3>
        {/*
         * FIX 2 — `min-w-0` on the relative wrapper prevents the absolutely-
         * positioned icon from widening the input row beyond the sidebar.
         */}
        <div className="relative min-w-0">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#686660] text-sm pointer-events-none">
            ⌕
          </span>
          <input
          suppressHydrationWarning 
            type="text"
            value={filterText}
            onChange={e => setFilterText(e.target.value)}
            placeholder="Title or author…"
            className="w-full min-w-0 pl-7 pr-2.5 py-1.5
                       bg-[#181c24] border border-white/[0.07] rounded-lg
                       text-[#e8e6e0] text-[13px] outline-none
                       focus:border-[#4f8ef7] transition-colors"
          />
        </div>
      </div>

      {/* Edge type */}
      <div className="px-3.5 py-3 border-b border-white/[0.07] flex-shrink-0">
        <h3 className="text-[11px] tracking-widest uppercase text-[#686660] mb-2">Edge type</h3>
        <div className="flex flex-wrap gap-1.5">
          {EDGE_FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => onEdgeFilter(f.value)}
              className={[
                'text-xs px-2.5 py-0.5 rounded-full border',
                'transition-all select-none bg-transparent',
                edgeFilter === f.value
                  ? 'border-[#4f8ef7] text-[#4f8ef7] bg-[rgba(79,142,247,.1)]'
                  : 'border-white/[0.07] text-[#686660] hover:border-white/[0.13] hover:text-[#e8e6e0]',
              ].join(' ')}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Year range */}
      <div className="px-3.5 py-3 border-b border-white/[0.07] flex-shrink-0">
        <h3 className="text-[11px] tracking-widest uppercase text-[#686660] mb-2">Year range</h3>
        {/*
         * FIX 3 — year-range row.
         * `min-w-[72px]` on the label was fighting the flex row for space.
         * Replace with a fixed `w-[60px]` and `flex-shrink-0` so it never
         * forces the sliders to shrink below their min-width.
         * Each range input gets `min-w-0` so it can actually compress.
         */}
        <div className="flex gap-2 items-center">
          <input
          suppressHydrationWarning 
            type="range" min={2010} max={2025} value={yearMin}
            onChange={e => setYearMin(Math.min(Number(e.target.value), yearMax))}
            className="flex-1 min-w-0"
          />
          <span className="flex-shrink-0 w-[60px] text-center
                           font-mono text-[11px] text-[#4f8ef7]">
            {yearMin}–{yearMax}
          </span>
          <input
          suppressHydrationWarning 
            type="range" min={2010} max={2025} value={yearMax}
            onChange={e => setYearMax(Math.max(Number(e.target.value), yearMin))}
            className="flex-1 min-w-0"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="px-3.5 py-3 border-b border-white/[0.07] flex-shrink-0">
        <h3 className="text-[11px] tracking-widest uppercase text-[#686660] mb-2">Stats</h3>
        {/*
         * FIX 4 — stat cards.
         * Long font-mono numbers (e.g. "0.0") in a 2-column grid don't wrap;
         * add `truncate` so they clip instead of pushing the card wider.
         */}
        <div className="grid grid-cols-2 gap-1.5">
          {([
            { label: 'Papers',      value: data?.nodes.length ?? '—', color: 'text-[#4f8ef7]'  },
            { label: 'Links',       value: data?.edges.length ?? '—', color: 'text-[#22c999]'  },
            { label: 'Most linked', value: data ? topDeg       : '—', color: 'text-[#f5a623]'  },
            { label: 'Avg degree',  value: data ? avgDeg       : '—', color: 'text-[#e8e6e0]'  },
          ] as const).map(s => (
            <div key={s.label}
                 className="bg-[#181c24] rounded-lg p-2.5 border border-white/[0.07] min-w-0">
              <div className="text-[11px] text-[#686660] mb-0.5 truncate">{s.label}</div>
              <div className={`text-lg font-semibold font-mono truncate ${s.color}`}>
                {s.value}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Paper list — only this section scrolls */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0">
        {!data ? (
          <div className="flex flex-col items-center justify-center gap-2.5
                          text-[#686660] px-5 py-10">
            <span className="text-4xl opacity-35">📄</span>
            <p className="text-sm">Papers appear here</p>
            <small className="text-xs opacity-60">after you search a topic</small>
          </div>
        ) : (
          <PaperList
            papers={filteredPapers}
            selectedId={selectedId}
            onSelectPaper={onSelectPaper}
          />
        )}
      </div>
    </aside>
  );
}