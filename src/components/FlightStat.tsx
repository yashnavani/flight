export function Stat({ label, v }: { label: string; v: string }) {
  return (
    <div className="radar-chrome-subtle rounded-xl px-2.5 py-2 ring-1 ring-white/[0.06]">
      <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</div>
      <div className="mt-0.5 font-mono text-sm font-medium tabular-nums text-cyan-100/95">{v}</div>
    </div>
  );
}

export function fmtNum(n: number | null, d: number) {
  if (n === null || Number.isNaN(n)) return "—";
  return n.toFixed(d);
}
