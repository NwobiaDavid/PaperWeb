// components/TopPapersPanel.tsx
'use client';

import type { AppData } from '@/lib/types';

interface Props { data: AppData | null; }

export default function TopPapersPanel({ data }: Props) {
  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full gap-2.5 text-[#686660]">
        <span className="text-4xl opacity-35">🏆</span>
        <p className="text-sm">Search a topic to see top papers</p>
      </div>
    );
  }

  const sorted = [...data.nodes]
    .sort((a, b) => (b.degree ?? 0) - (a.degree ?? 0))
    .slice(0, 30);

  return (
    <div className="flex-1 overflow-y-auto w-full p-6">
      {sorted.map((p, i) => {
        const rank    = String(i + 1).padStart(2, '0');
        const authors = p.authors.slice(0, 3).join(', ');
        const cats    = p.categories.slice(0, 2).join(', ');

        return (
          <div
            key={p.id}
            className="bg-[#111318] border border-white/[0.07] rounded-xl p-4 mb-2.5
                       flex gap-3.5 items-start hover:border-white/[0.13] transition-colors"
          >
            {/* Rank */}
            <div className="text-xl font-bold font-mono text-white/[0.13] min-w-[28px] leading-none">
              {rank}
            </div>

            {/* Body */}
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-medium leading-snug mb-1.5 text-[#e8e6e0]">
                {p.title}
              </h4>
              <div className="text-xs text-[#686660] flex gap-3 flex-wrap">
                <span>📅 {p.year || '?'}</span>
                {authors && <span>👥 {authors}</span>}
                {cats    && <span>📂 {cats}</span>}
              </div>
              <a
                href={p.url}
                target="_blank"
                rel="noreferrer"
                className="mt-1.5 inline-block text-xs text-[#4f8ef7] hover:opacity-80 transition-opacity"
              >
                arXiv ↗
              </a>
            </div>

            {/* Connection count */}
            <div className="ml-auto text-right font-mono flex-shrink-0">
              <div className="text-lg font-bold text-[#4f8ef7]">{p.degree ?? 0}</div>
              <div className="text-[10px] text-[#686660] mt-0.5">connections</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}