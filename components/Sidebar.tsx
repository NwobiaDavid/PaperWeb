// components/Sidebar.tsx
'use client';

import { useState, useMemo } from 'react';
import type { AppData, EdgeFilter, Paper } from '@/lib/types';
import PaperList from './PaperList';

interface Props {
  data:           AppData | null;
  edgeFilter:     EdgeFilter;
  onEdgeFilter:   (f: EdgeFilter) => void;
  selectedId:     string | null;
  onSelectPaper:  (id: string) => void;
}

const EDGE_FILTERS: { label: string; value: EdgeFilter }[] = [
  { label: 'All',       value: 'all' },
  { label: 'Citations', value: 'citation' },
  { label: 'Co-authors',value: 'coauthor' },
];

export default function Sidebar({
  data, edgeFilter, onEdgeFilter, selectedId, onSelectPaper,
}: Props) {
  const [filterText, setFilterText]   = useState('');
  const [yearMin,    setYearMin]      = useState(2010);
  const [yearMax,    setYearMax]      = useState(2025);

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

  function handleYearMin(v: number) {
    setYearMin(Math.min(v, yearMax));
  }
  function handleYearMax(v: number) {
    setYearMax(Math.max(v, yearMin));
  }

  return (
    <aside className="bg-[#111318] border-r border-white/[0.07] overflow-y-auto flex flex-col">

      {/* Text filter */}
      <div className="px-3.5 py-3 border-b border-white/[0.07]">
        <h3 className="text-[11px] tracking-widest uppercase text-[#686660] mb-2">
          Filter results
        </h3>
        <div className="relative">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#686660] text-sm">⌕</span>
          <input
            type="text"
            value={filterText}
            onChange={e => setFilterText(e.target.value)}
            placeholder="Title or author…"
            className="w-full pl-7 pr-2.5 py-1.5 bg-[#181c24] border border-white/[0.07] rounded-lg
                       text-[#e8e6e0] text-[13px] outline-none focus:border-[#4f8ef7] transition-colors"
          />
        </div>
      </div>

      {/* Edge type */}
      <div className="px-3.5 py-3 border-b border-white/[0.07]">
        <h3 className="text-[11px] tracking-widest uppercase text-[#686660] mb-2">Edge type</h3>
        <div className="flex flex-wrap gap-1.5">
          {EDGE_FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => onEdgeFilter(f.value)}
              className={`text-xs px-2.5 py-0.5 rounded-full border transition-all select-none bg-transparent
                ${edgeFilter === f.value
                  ? 'border-[#4f8ef7] text-[#4f8ef7] bg-[rgba(79,142,247,.1)]'
                  : 'border-white/[0.07] text-[#686660] hover:border-white/[0.13] hover:text-[#e8e6e0]'
                }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Year range */}
      <div className="px-3.5 py-3 border-b border-white/[0.07]">
        <h3 className="text-[11px] tracking-widest uppercase text-[#686660] mb-2">Year range</h3>
        <div className="flex gap-2 items-center">
          <input
            type="range" min={2010} max={2025} value={yearMin}
            onChange={e => handleYearMin(Number(e.target.value))}
            className="flex-1 accent-[#4f8ef7]"
          />
          <span className="font-mono text-[11px] whitespace-nowrap text-[#4f8ef7] min-w-[72px] text-center">
            {yearMin}–{yearMax}
          </span>
          <input
            type="range" min={2010} max={2025} value={yearMax}
            onChange={e => handleYearMax(Number(e.target.value))}
            className="flex-1 accent-[#4f8ef7]"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="px-3.5 py-3 border-b border-white/[0.07]">
        <h3 className="text-[11px] tracking-widest uppercase text-[#686660] mb-2">Stats</h3>
        <div className="grid grid-cols-2 gap-1.5">
          {[
            { label: 'Papers',      value: data?.nodes.length ?? '—', color: 'text-[#4f8ef7]' },
            { label: 'Links',       value: data?.edges.length ?? '—', color: 'text-[#22c999]' },
            { label: 'Most linked', value: data ? topDeg          : '—', color: 'text-[#f5a623]' },
            { label: 'Avg degree',  value: data ? avgDeg          : '—', color: 'text-[#e8e6e0]' },
          ].map(s => (
            <div key={s.label} className="bg-[#181c24] rounded-lg p-2.5 border border-white/[0.07]">
              <div className="text-[11px] text-[#686660] mb-0.5">{s.label}</div>
              <div className={`text-lg font-semibold font-mono ${s.color}`}>{s.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Paper list */}
      <div className="overflow-y-auto flex-1">
        {!data ? (
          <div className="flex flex-col items-center justify-center gap-2.5 text-[#686660] px-5 py-10">
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