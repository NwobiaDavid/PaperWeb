// components/MobileGate.tsx
// -----------------------------------------------------------------------------
// Shown on viewports narrower than the `md` breakpoint (< 768 px).
// The full app is hidden via `hidden md:flex` on its wrapper in CitationMapper;
// this screen fills the viewport in its place with no JavaScript required.

export default function MobileGate() {
  return (
    <div
      className="
        flex md:hidden
        flex-col items-center justify-center gap-6
        h-screen w-screen px-8 text-center
        bg-[#0a0b0e]
      "
    >
      {/* Icon */}
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center bg-slate-900 text-3xl flex-shrink-0"
      >
        🖥️
      </div>

      {/* Heading */}
      <div className="space-y-2">
        <h1 className="text-xl font-semibold tracking-tight text-[#e8e6e0]">
          Desktop required
        </h1>
        <p className="text-sm text-[#686660] leading-relaxed max-w-xs">
          Citation Network Mapper is a data-dense research tool built for large
          screens. Please open it on a desktop or laptop browser for the best
          experience.
        </p>
      </div>

      {/* Tip card */}
      <div className="w-full max-w-xs rounded-xl border border-white/[0.07] bg-[#111318] p-4 text-left space-y-2">
        <p className="text-[11px] uppercase tracking-widest text-[#686660]">Quick tip</p>
        <p className="text-sm text-[#e8e6e0]">
          On most mobile browsers you can request the desktop site from the
          address bar menu — look for{' '}
          <span className="text-[#4f8ef7]">Desktop site</span> or{' '}
          <span className="text-[#4f8ef7]">Request desktop version</span>.
        </p>
      </div>

      {/* Minimum width note */}
      <p className="text-[11px] text-[#686660]">
        Minimum recommended width: 1024 px
      </p>
    </div>
  );
}