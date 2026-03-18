// components/PaperList.tsx
'use client';

import type { Paper } from '@/lib/types';

interface Props {
  papers:        Paper[];
  selectedId:    string | null;
  onSelectPaper: (id: string) => void;
}

export default function PaperList({ papers, selectedId, onSelectPaper }: Props) {
  if (!papers.length) {
    return (
      <div className="flex flex-col items-center justify-center gap-2.5
                      text-[#686660] px-5 py-10">
        <span className="text-4xl opacity-35">🔎</span>
        <p className="text-sm">No matching papers</p>
      </div>
    );
  }

  const sorted = [...papers].sort((a, b) => (b.degree ?? 0) - (a.degree ?? 0));

  return (
    <>
      {sorted.map(n => {
        const authors    = n.authors.slice(0, 2).join(', ');
        const isSelected = n.id === selectedId;

        return (
          <div
            key={n.id}
            onClick={() => onSelectPaper(n.id)}
            className={[
              // FIX — min-w-0 + overflow-hidden keep every row inside the column
              'min-w-0 overflow-hidden',
              'px-3.5 py-3 border-b border-white/[0.07]',
              'cursor-pointer transition-colors',
              isSelected ? 'bg-[#181c24]' : 'hover:bg-[#181c24]',
            ].join(' ')}
          >
            {/* Title — clamp to 2 lines instead of overflowing */}
            <p className="text-[13px] font-medium leading-snug mb-1 text-[#e8e6e0]
                          line-clamp-2">
              {n.title}
            </p>

            <div className="flex gap-2 flex-wrap items-center min-w-0">
              <span className="text-xs text-[#686660] flex-shrink-0">
                {n.year || '?'}
              </span>
              {/* Author string truncates instead of wrapping */}
              <span className="text-xs text-[#686660] truncate min-w-0 flex-1">
                {authors}
              </span>
              {/* Degree badge — always visible, never pushed off */}
              <span className="flex-shrink-0 text-[11px] font-mono px-1.5 py-0.5 rounded
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