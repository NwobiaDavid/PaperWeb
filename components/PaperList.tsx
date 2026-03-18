// components/PaperList.tsx
'use client';

import type { Paper } from '@/lib/types';

interface Props {
  papers:         Paper[];
  selectedId:     string | null;
  onSelectPaper:  (id: string) => void;
}

export default function PaperList({ papers, selectedId, onSelectPaper }: Props) {
  if (!papers.length) {
    return (
      <div className="flex flex-col items-center justify-center gap-2.5 text-[#686660] px-5 py-10">
        <span className="text-4xl opacity-35">🔎</span>
        <p className="text-sm">No matching papers</p>
      </div>
    );
  }

  const sorted = [...papers].sort((a, b) => (b.degree ?? 0) - (a.degree ?? 0));

  return (
    <>
      {sorted.map(n => {
        const authors = n.authors.slice(0, 2).join(', ');
        const isSelected = n.id === selectedId;
        return (
          <div
            key={n.id}
            onClick={() => onSelectPaper(n.id)}
            className={`px-3.5 py-3 border-b border-white/[0.07] cursor-pointer transition-colors
                        ${isSelected ? 'bg-[#181c24]' : 'hover:bg-[#181c24]'}`}
          >
            <p className="text-[13px] font-medium leading-snug mb-1 text-[#e8e6e0]">
              {n.title}
            </p>
            <div className="text-xs text-[#686660] flex gap-2 flex-wrap items-center">
              <span>{n.year || '?'}</span>
              <span>{authors}</span>
              <span className="ml-auto text-[11px] font-mono px-1.5 py-0.5 rounded
                               bg-[rgba(79,142,247,.1)] text-[#4f8ef7]
                               border border-[rgba(79,142,247,.2)]">
                {n.degree}🔗
              </span>
            </div>
          </div>
        );
      })}
    </>
  );
}