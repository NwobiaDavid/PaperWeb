// components/LoadingOverlay.tsx
'use client';

interface Props {
  text: string;
  sub:  string;
}

export default function LoadingOverlay({ text, sub }: Props) {
  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 flex-col gap-3.5">
      {/* Spinner */}
      <div className="w-9 h-9 rounded-full border-[3px] border-white/10 border-t-[#4f8ef7] animate-spin" />
      <p className="text-sm text-[#e8e6e0]">{text}</p>
      <p className="text-xs text-[#686660]">{sub}</p>
    </div>
  );
}