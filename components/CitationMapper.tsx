// components/CitationMapper.tsx
'use client';

import { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';

import type { AppData, EdgeFilter, LoadingState } from '@/lib/types';
import { DEFAULT_MAX_RESULTS } from '@/lib/config';
import { fetchArxiv, sleep } from '@/lib/api';
import { buildNetwork, computeTrends } from '@/lib/network';

import MobileGate     from './MobileGate';
import LoadingOverlay from './LoadingOverlay';
import Header         from './Header';
import QuickBar       from './QuickBar';
import Sidebar        from './Sidebar';
import TrendsPanel    from './TrendsPanel';
import TopPapersPanel from './TopPapersPanel';

// GraphPanel uses D3 (browser-only) — skip SSR entirely
const GraphPanel = dynamic(() => import('./GraphPanel'), { ssr: false });

const TABS = [
  { id: 'graph',  label: '🕸 Network Graph' },
  { id: 'trends', label: '📈 Keyword Trends' },
  { id: 'top',    label: '🏆 Top Papers' },
] as const;

type TabId = typeof TABS[number]['id'];

export default function CitationMapper() {
  const [topic,      setTopic]      = useState('renewable energy storage');
  const [data,       setData]       = useState<AppData | null>(null);
  const [loading,    setLoading]    = useState<LoadingState>({ active: false, text: '', sub: '' });
  const [activeTab,  setActiveTab]  = useState<TabId>('graph');
  const [edgeFilter, setEdgeFilter] = useState<EdgeFilter>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // ── Search pipeline ────────────────────────────────────────────────────────
  const startSearch = useCallback(async (searchTopic?: string) => {
    const q = (searchTopic ?? topic).trim();
    if (!q) return;

    if (searchTopic) setTopic(searchTopic);

    setLoading({ active: true, text: 'Connecting to arXiv…', sub: 'Fetching real paper metadata' });

    try {
      const papers = await fetchArxiv(
        q,
        DEFAULT_MAX_RESULTS,
        (text, sub) => setLoading({ active: true, text, sub })
      );

      if (!papers.length) {
        alert('No papers found. Try different keywords.');
        return;
      }

      setLoading({
        active: true,
        text: `Building network from ${papers.length} papers…`,
        sub:  'Mapping co-authorship and citation links',
      });
      await sleep(80);
      const edges = buildNetwork(papers);

      setLoading({
        active: true,
        text: 'Computing keyword trends…',
        sub:  'Analyzing term frequency 2012–2025',
      });
      await sleep(80);
      const trends = computeTrends(papers, q);

      setData({
        meta: {
          node_count: papers.length,
          edge_count: edges.length,
          generated:  new Date().toISOString(),
          topic: q,
        },
        nodes:  papers,
        edges,
        trends,
      });

    } catch (err) {
      alert(`Error: ${(err as Error).message}\n\nCheck your internet connection and try again.`);
    } finally {
      setLoading({ active: false, text: '', sub: '' });
    }
  }, [topic]);

  const handleSelectPaper = useCallback((id: string) => {
    setSelectedId(id);
    setActiveTab('graph');
  }, []);

  const topicLabel = data
    ? `"${data.meta.topic}" — ${data.nodes.length} papers fetched`
    : 'Enter a topic to explore the literature';

  return (
    <>
      {/* ── Mobile gate — visible below md breakpoint, hidden above ── */}
      <MobileGate />

      {/* ── Full app — hidden below md breakpoint, visible above ── */}
      <div className="hidden md:flex flex-col h-screen bg-[#0a0b0e] text-[#e8e6e0] overflow-hidden">

        {loading.active && (
          <LoadingOverlay text={loading.text} sub={loading.sub} />
        )}

        <Header
          topicLabel={topicLabel}
          nodeCount={data?.nodes.length ?? null}
          edgeCount={data?.edges.length ?? null}
          topicValue={topic}
          onTopicChange={setTopic}
          onSearch={() => startSearch()}
          searching={loading.active}
        />

        <QuickBar onSearch={startSearch} />

        {/* ── App grid: sidebar + main ── */}
        <div className="grid flex-1 overflow-hidden" style={{ gridTemplateColumns: '272px 1fr' }}>

          <Sidebar
            data={data}
            edgeFilter={edgeFilter}
            onEdgeFilter={setEdgeFilter}
            selectedId={selectedId}
            onSelectPaper={handleSelectPaper}
          />

          <main className="flex flex-col overflow-hidden">

            {/* Tab bar */}
            <div className="flex border-b border-white/[0.07] bg-[#111318] flex-shrink-0">
              {TABS.map(tab => (
                <button
                suppressHydrationWarning 
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={[
                    'px-4 py-3 text-sm cursor-pointer border-b-2 transition-all select-none bg-transparent',
                    activeTab === tab.id
                      ? 'text-[#e8e6e0] border-[#4f8ef7]'
                      : 'text-[#686660] border-transparent hover:text-[#e8e6e0]',
                  ].join(' ')}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Panels — all mounted so D3/Chart state survives tab switches */}
            <div className={`flex-1 overflow-hidden ${activeTab === 'graph' ? 'flex' : 'hidden'}`}>
              <GraphPanel
                data={data}
                edgeFilter={edgeFilter}
                highlightId={selectedId}
              />
            </div>

            <div className={`flex-1 overflow-hidden ${activeTab === 'trends' ? 'flex' : 'hidden'}`}>
              <TrendsPanel data={data} />
            </div>

            <div className={`flex-1 overflow-hidden ${activeTab === 'top' ? 'flex' : 'hidden'}`}>
              <TopPapersPanel data={data} />
            </div>

          </main>
        </div>
      </div>
    </>
  );
}