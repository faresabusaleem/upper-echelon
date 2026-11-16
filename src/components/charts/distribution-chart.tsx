/** Members' best scores as a histogram, with the viewer's position marked in gold. */
export function DistributionChart({
  buckets,
  lo,
  hi,
  count = 24,
  mark,
  unit,
}: {
  buckets: Array<{ bucket: number; members: number }>;
  lo: number;
  hi: number;
  count?: number;
  mark?: number | null;
  unit: string;
}) {
  const W = 720;
  const H = 160;
  const values = Array.from({ length: count }, (_, i) => buckets.find((b) => b.bucket === i + 1)?.members ?? 0);
  const peak = Math.max(1, ...values);
  const bw = W / count;
  const markX = mark == null ? null : Math.min(W - 1, Math.max(1, ((mark - lo) / (hi - lo)) * W));
  const total = values.reduce((a, b) => a + b, 0);
  return (
    <figure className="w-full">
      <svg viewBox={`0 0 ${W} ${H + 24}`} className="h-auto w-full" role="img" aria-label={`Distribution of ${total} members' best scores`}>
        {values.map((v, i) => {
          const h = (v / peak) * H;
          return <rect key={i} x={i * bw + 1} y={H - h} width={bw - 2} height={h} className="fill-[var(--color-panel-3)]" />;
        })}
        {markX != null && <rect x={markX - 1.5} y={0} width={3} height={H} className="fill-[var(--color-gold)]" />}
        <text x={0} y={H + 18} className="fill-[var(--color-muted)] font-mono text-[11px]">
          {lo} {unit}
        </text>
        <text x={W} y={H + 18} textAnchor="end" className="fill-[var(--color-muted)] font-mono text-[11px]">
          {hi} {unit}
        </text>
      </svg>
      <figcaption className="mt-2 text-micro text-muted">
        {total === 0 ? "No members have a result yet." : `Best scores of ${total.toLocaleString("en-GB")} members.`}
        {markX != null && " The gold line is you."}
      </figcaption>
    </figure>
  );
}
