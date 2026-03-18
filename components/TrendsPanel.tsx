/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/set-state-in-effect */
// components/TrendsPanel.tsx
'use client';

import { useEffect, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale,
  PointElement, LineElement,
  BarElement, Title, Tooltip, Legend,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import type { AppData } from '@/lib/types';
import { COLORS } from '@/lib/config';

ChartJS.register(
  CategoryScale, LinearScale,
  PointElement, LineElement,
  BarElement, Title, Tooltip, Legend,
);

const SCALE_DEFAULTS = {
  grid:  { color: 'rgba(255,255,255,0.05)' },
  ticks: { color: '#686660', font: { size: 12 } },
} as const;

const CHART_OPTIONS = {
  responsive:          true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    x: SCALE_DEFAULTS,
    y: { ...SCALE_DEFAULTS, beginAtZero: true },
  },
} as const;

interface Props { data: AppData | null; }

export default function TrendsPanel({ data }: Props) {
  const [activeTerms, setActiveTerms] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!data) return;
    const terms = Object.keys(data.trends.series);
    setActiveTerms(new Set(terms.slice(0, 6)));
  }, [data]);

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full gap-2.5 text-[#686660]">
        <span className="text-4xl opacity-35">📈</span>
        <p className="text-sm">Search a topic to see trends</p>
      </div>
    );
  }

  const { years, series } = data.trends;
  const terms = Object.keys(series);

  const toggleTerm = (term: string) =>
    setActiveTerms(prev => {
      const next = new Set(prev);
      next.has(term) ? next.delete(term) : next.add(term);
      return next;
    });

  // Line chart datasets
  const lineDatasets = terms.map((term, i) => ({
    label:           term,
    data:            years.map(y => series[term][y] ?? 0),
    borderColor:     COLORS[i % COLORS.length],
    backgroundColor: 'transparent',
    borderWidth:     2,
    pointRadius:     3,
    tension:         0.4,
    hidden:          !activeTerms.has(term),
  }));

  // Bar chart — papers per year
  const yearCounts: Record<number, number> = {};
  data.nodes.forEach(n => { yearCounts[n.year] = (yearCounts[n.year] ?? 0) + 1; });
  const sortedYears = Object.keys(yearCounts).sort();

  const card = 'bg-[#111318] border border-white/[0.07] rounded-xl p-5 mb-4';

  return (
    <div className="flex-1 overflow-y-auto w-full p-6">

      {/* Keyword frequency line chart */}
      <div className={card}>
        <h3 className="text-[15px] font-semibold mb-1 text-[#e8e6e0]">
          Keyword frequency over time
        </h3>
        <p className="text-sm text-[#686660] mb-4">
          How key terms from &ldquo;{data.meta.topic}&rdquo; appear per year
        </p>

        {/* Toggleable legend */}
        <div className="flex flex-wrap gap-2 mb-3">
          {terms.map((term, i) => (
            <button
              key={term}
              onClick={() => toggleTerm(term)}
              className={[
                'text-xs flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border',
                'cursor-pointer transition-all bg-transparent',
                activeTerms.has(term)
                  ? 'border-white/[0.13] text-[#e8e6e0]'
                  : 'border-white/[0.07] text-[#686660]',
              ].join(' ')}
            >
              <span
                className="w-2 h-2 rounded-sm flex-shrink-0"
                style={{ background: COLORS[i % COLORS.length] }}
              />
              {term}
            </button>
          ))}
        </div>

        <div className="relative h-80">
          <Line
            data={{ labels: years.map(String), datasets: lineDatasets }}
            options={CHART_OPTIONS as any}
          />
        </div>
      </div>

      {/* Publication volume bar chart */}
      <div className={card}>
        <h3 className="text-[15px] font-semibold mb-1 text-[#e8e6e0]">
          Publication volume by year
        </h3>
        <p className="text-sm text-[#686660] mb-4">
          Papers in this dataset published per year
        </p>
        <div className="relative h-60">
          <Bar
            data={{
              labels: sortedYears,
              datasets: [{
                label:           'Papers',
                data:            sortedYears.map(y => yearCounts[Number(y)]),
                backgroundColor: sortedYears.map(
                  (_, i) => `hsla(${200 + i * 7}, 70%, 60%, 0.7)`
                ),
                borderRadius: 4,
              }],
            }}
            options={CHART_OPTIONS as any}
          />
        </div>
      </div>
    </div>
  );
}