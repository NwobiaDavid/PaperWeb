// components/QuickBar.tsx
'use client';

import { QUICK_TOPICS } from '@/lib/config';

interface Props {
  onSearch: (query: string) => void;
}

export default function QuickBar({ onSearch }: Props) {
  return (
    <div className="bg-[#111318] border-b border-white/[0.07] px-6 py-1.5 flex items-center gap-2 flex-wrap">
      <span className="text-xs text-[#686660] whitespace-nowrap">Quick topics:</span>
      {QUICK_TOPICS.map(({ label, query }) => (
        <button
          key={query}
          onClick={() => onSearch(query)}
          className="text-xs px-2.5 py-0.5 rounded-full border border-white/[0.07]
                     text-[#686660] cursor-pointer hover:border-white/[0.13]
                     hover:text-[#e8e6e0] transition-all whitespace-nowrap bg-transparent"
        >
          {label}
        </button>
      ))}
    </div>
  );
}