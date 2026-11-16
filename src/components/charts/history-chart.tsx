import { formatShortDate } from "@/lib/utils";

type Point = { at: string; score: number };

/**
 * Progress over time: every saved result as a dot, the running personal best as a stepped line.
 * Plain SVG, one accent. For "lower is better" games the axis is inverted so up always means better.
 */
export function HistoryChart({
  points,
  lowerIsBetter,
  unit,
  height = 220,
}: {
  points: Point[];
  lowerIsBetter: boolean;
  unit: string;
  height?: number;
}) {
  if (points.length === 0) return null;
  const W = 720;
  const H = height;
  const pad = { l: 48, r: 16, t: 16, b: 28 };
  const scores = points.map((p) => p.score);
  let min = Math.min(...scores);
  let max = Math.max(...scores);
  if (min === max) {
    min -= 1;
    max += 1;
  }
  const span = max - min;
  min -= span * 0.08;
  max += span * 0.08;
  const x = (i: number) => pad.l + (points.length === 1 ? (W - pad.l - pad.r) / 2 : (i / (points.length - 1)) * (W - pad.l - pad.r));
  const y = (v: number) => {
    const t = (v - min) / (max - min);
    return pad.t + (lowerIsBetter ? t : 1 - t) * (H - pad.t - pad.b);
  };
  let best = scores[0];
  const bestPath = points
    .map((p, i) => {
      if (lowerIsBetter ? p.score < best : p.score > best) best = p.score;
      return `${i === 0 ? "M" : "H"}${x(i).toFixed(1)}${i === 0 ? ` ${y(best).toFixed(1)}` : ` V${y(best).toFixed(1)}`}`;
    })
    .join(" ");
  const ticks = [0, 0.5, 1].map((t) => min + t * (max - min));
  return (
    <figure className="w-full">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`Your ${points.length} results over time`}>
        {ticks.map((v) => (
          <g key={v}>
            <text x={pad.l - 10} y={y(v) + 4} textAnchor="end" className="fill-[var(--color-muted)] font-mono text-[11px]">
              {Math.round(v)}
            </text>
          </g>
        ))}
        <path d={bestPath} fill="none" stroke="var(--color-gold)" strokeWidth={2} />
        {points.map((p, i) => (
          <circle key={i} cx={x(i)} cy={y(p.score)} r={points.length > 60 ? 2 : 3} className="fill-[var(--color-ink-2)]">
            <title>
              {formatShortDate(p.at)}: {p.score} {unit}
            </title>
          </circle>
        ))}
        <text x={pad.l} y={H - 8} className="fill-[var(--color-muted)] text-[11px]">
          {formatShortDate(points[0].at)}
        </text>
        <text x={W - pad.r} y={H - 8} textAnchor="end" className="fill-[var(--color-muted)] text-[11px]">
          {formatShortDate(points[points.length - 1].at)}
        </text>
      </svg>
      <figcaption className="mt-2 text-micro text-muted">
        Dots are results; the gold line is your best so far. {lowerIsBetter ? "Lower is better, shown higher." : "Higher is better."}
      </figcaption>
    </figure>
  );
}
