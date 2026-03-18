// components/Header.tsx
'use client';

interface Props {
  topicLabel:  string;
  nodeCount:   number | null;
  edgeCount:   number | null;
  topicValue:  string;
  onTopicChange: (v: string) => void;
  onSearch:    () => void;
  searching:   boolean;
}

export default function Header({
  topicLabel, nodeCount, edgeCount,
  topicValue, onTopicChange, onSearch, searching,
}: Props) {
  return (
    <header className="px-6 py-3.5 border-b border-white/[0.07] flex items-center gap-4 bg-[#111318] flex-wrap">
      {/* Logo */}
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center text-3xl border p-5 bg-slate-900 flex-shrink-0"
        // style={{ background: 'linear-gradient(135deg,#4f8ef7,#22c999)' }}
      >
        🕸️
      </div>

      {/* Title */}
      <div>
        <h1 className="text-base font-semibold tracking-tight text-[#e8e6e0]">
          Paper Web
        </h1>
        <p className="text-xs text-[#686660]">{topicLabel}</p>
      </div>

      {/* Search form */}
      <div className="flex gap-2 flex-1 min-w-[260px] max-w-xl">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#686660] text-sm pointer-events-none">
            🔍
          </span>
          <input
            type="text"
            value={topicValue}
            onChange={e => onTopicChange(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && onSearch()}
            placeholder="e.g. CRISPR gene editing, federated learning…"
            className="w-full pl-9 pr-3 py-2 bg-[#181c24] border border-white/[0.13] rounded-lg
                       text-[#e8e6e0] text-sm outline-none focus:border-[#4f8ef7] transition-colors"
          />
        </div>
        <button
          onClick={onSearch}
          disabled={searching}
          className="px-4 py-2 bg-[#4f8ef7] text-white rounded-lg text-sm font-medium
                     hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed
                     transition-opacity flex-shrink-0"
        >
          Search
        </button>
      </div>

      {/* Badges */}
      <div className="flex gap-2 items-center ml-auto">
        {nodeCount !== null && (
          <span className="text-[11px] px-2.5 py-0.5 rounded-full border font-mono
                           border-[rgba(79,142,247,.4)] text-[#4f8ef7] bg-[rgba(79,142,247,.08)]">
            {nodeCount} papers
          </span>
        )}
        {edgeCount !== null && (
          <span className="text-[11px] px-2.5 py-0.5 rounded-full border font-mono
                           border-[rgba(34,201,153,.4)] text-[#22c999] bg-[rgba(34,201,153,.08)]">
            {edgeCount} edges
          </span>
        )}
        {nodeCount === null && (
          <>
            <span className="text-[11px] px-2.5 py-0.5 rounded-full border font-mono border-white/[0.07] text-[#686660]">—</span>
            <span className="text-[11px] px-2.5 py-0.5 rounded-full border font-mono border-white/[0.07] text-[#686660]">—</span>
          </>
        )}
      </div>
    </header>
  );
}