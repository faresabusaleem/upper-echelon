import type { SVGProps } from "react";
import { THEMES, tierInfo } from "@/lib/tiers";
import { cn } from "@/lib/utils";

/**
 * The society's sigils: one line drawing per room on the board, plus the flame used for lives in
 * the Arena. Drawn for Upper Echelon on a 24-unit grid with a 1.5 stroke.
 */
const PATHS: Record<string, React.ReactNode> = {
  seal: (
    <>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="4.5" />
      <path d="M12 9.6l.7 1.7 1.7.7-1.7.7-.7 1.7-.7-1.7-1.7-.7 1.7-.7Z" />
    </>
  ),
  hand: (
    <path d="M8 13V6.5a1.5 1.5 0 0 1 3 0V11m0-1V5a1.5 1.5 0 0 1 3 0v6m0-.5V6.5a1.5 1.5 0 0 1 3 0V14a6 6 0 0 1-6 6h-.5a5.5 5.5 0 0 1-4.6-2.5L4.6 13.8a1.5 1.5 0 0 1 2.4-1.8L8 13.5" />
  ),
  scale: (
    <>
      <path d="M12 4v16M8 20h8M5 7h14" />
      <path d="M5 7l-2.5 6a2.5 2.5 0 0 0 5 0Zm14 0-2.5 6a2.5 2.5 0 0 0 5 0Z" />
    </>
  ),
  ledger: (
    <>
      <rect x="5" y="3.5" width="14" height="17" rx="1.5" />
      <path d="M8.5 3.5v17M11 8h5M11 11h5M11 14h3" />
    </>
  ),
  compass: (
    <>
      <circle cx="12" cy="4.5" r="1.5" />
      <path d="M11.3 5.8 6.5 20M12.7 5.8 17.5 20M8.4 14.5h7.2" />
    </>
  ),
  flask: <path d="M9.5 3h5M10.5 3v6L5.5 18a1.5 1.5 0 0 0 1.3 2.2h10.4a1.5 1.5 0 0 0 1.3-2.2L13.5 9V3M7.6 14.5h8.8" />,
  lamp: (
    <path d="M4 14c0-2 2-3 5-3h6l3-2 2 1-3 3c0 2-2 4-6 4H9c-3 0-5-1-5-3ZM12 11V9.2M12 7c.8 0 1.3-.8 1.1-1.6-.2-.8-1.1-1.4-1.1-2.4-.8.8-1.7 1.6-1.7 2.6 0 .8.7 1.4 1.7 1.4ZM8 20h8" />
  ),
  key: (
    <>
      <circle cx="7.5" cy="12" r="3.5" />
      <path d="M11 12h9.5M16.5 12v3M19.5 12v2" />
    </>
  ),
  book: <path d="M12 6c-2-1.5-5-2-8-1.5V18c3-.5 6 0 8 1.5 2-1.5 5-2 8-1.5V4.5C17 4 14 4.5 12 6Zm0 0v13.5" />,
  candle: (
    <path d="M9 10h6v10H9ZM12 10V8.2M12 7.4c1 0 1.6-.9 1.3-1.9C13 4.6 12 4 12 3c-1 .9-1.8 1.8-1.8 2.9 0 .9.8 1.5 1.8 1.5ZM6.5 20h11" />
  ),
  chalice: <path d="M7 4h10c0 4-2 7-5 7S7 8 7 4ZM12 11v6M8.5 20h7M10 17h4" />,
  eye: (
    <>
      <path d="M12 2.8 21.6 20H2.4Z" />
      <path d="M7 14.6s2-3.1 5-3.1 5 3.1 5 3.1-2 3.1-5 3.1-5-3.1-5-3.1Z" />
      <circle cx="12" cy="14.6" r="1.4" />
    </>
  ),
  quill: <path d="M19.5 3.5c-6 1-10.5 5.5-12.5 11.5l-1.5 5 4.5-2.5c5-2 9-7.5 9.5-14ZM7.5 15c3-1 6-4 8.5-8" />,
  crown: <path d="M4 17 3 7l5 4 4-6 4 6 5-4-1 10ZM4.5 20h15" />,
  sword: <path d="M14.5 3.5H20v5.5L9 20l-2-2-2 2-1-1 2-2-2-2ZM12 12l3 3" />,
  star: <path d="M12 3.5 14.4 9l5.9.5-4.5 3.9 1.4 5.8L12 16.1 6.8 19.2l1.4-5.8-4.5-3.9 5.9-.5Z" />,
  bolt: <path d="M13.5 2.5 5 13.5h6.5l-1 8 8.5-11.5H12.5Z" />,
  path: (
    <>
      <circle cx="5.5" cy="18" r="2" />
      <circle cx="12" cy="6" r="2" />
      <circle cx="18.5" cy="15" r="2" />
      <path d="M6.5 16.2 11 7.8M13.3 7.6l4.1 5.7" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r="1" fill="currentColor" />
    </>
  ),
  hash: <path d="M9.5 4 8 20M16.5 4 15 20M4.5 9h15.5M4 15h15.5" />,
  scroll: (
    <path d="M8 4h10a2 2 0 0 1 2 2v1h-4M8 4a2 2 0 0 0-2 2v12a2 2 0 0 1-2 2h10a2 2 0 0 0 2-2V7M8 4a2 2 0 0 1 2 2M9.5 10.5h4.5M9.5 14h4.5" />
  ),
  dice: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="3.5" />
      <circle cx="8.5" cy="8.5" r="1" fill="currentColor" />
      <circle cx="12" cy="12" r="1" fill="currentColor" />
      <circle cx="15.5" cy="15.5" r="1" fill="currentColor" />
    </>
  ),
  grid: (
    <>
      <rect x="4" y="4" width="6.5" height="6.5" rx="1.6" />
      <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.6" />
      <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.6" />
      <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.6" fill="currentColor" opacity=".35" />
    </>
  ),
  keys: (
    <>
      <rect x="2.5" y="6" width="19" height="12" rx="2.5" />
      <path d="M6 10h.01M9.5 10h.01M13 10h.01M16.5 10h.01M8 14h8" />
    </>
  ),
  circle: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 3.5v17M3.5 12h17" opacity=".5" />
    </>
  ),
};

export type SigilName = keyof typeof PATHS;

export function Sigil({
  name,
  size = 22,
  className,
  ...props
}: { name: string; size?: number } & Omit<SVGProps<SVGSVGElement>, "name">) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={cn("shrink-0", className)}
      {...props}
    >
      {PATHS[name] ?? PATHS.quill}
    </svg>
  );
}

/** A candle flame: lit, or a cold wick once the life is spent. */
export function Flame({ lit = true, size = 26, className }: { lit?: boolean; size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 24 28" width={size} height={(size * 28) / 24} aria-hidden className={cn("shrink-0", className)}>
      {lit ? (
        <>
          <path
            d="M12 1.5c.7 3 2.8 4.6 4.4 6.6 1.7 2.1 2.6 4.2 2.6 6.5A7 7 0 0 1 12 21.8a7 7 0 0 1-7-7.2c0-2.7 1.4-4.7 3-6 .2 1.6 1 2.9 2.2 3.6-.5-3.6.6-7.3 1.8-10.7Z"
            fill="url(#flame-outer)"
          />
          <path d="M12 10.5c.4 1.5 1.5 2.4 2.2 3.4.6.9 1 1.8 1 2.8A3.2 3.2 0 0 1 12 20a3.2 3.2 0 0 1-3.2-3.3c0-1.5.8-2.6 1.7-3.4.1.8.4 1.3.9 1.6-.1-1.6.2-3.1.6-4.4Z" fill="#fff4d6" />
          <defs>
            <linearGradient id="flame-outer" x1="12" y1="1.5" x2="12" y2="21.8" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#ffd98a" />
              <stop offset=".55" stopColor="#e8a23c" />
              <stop offset="1" stopColor="#c8573f" />
            </linearGradient>
          </defs>
        </>
      ) : (
        <path d="M12 14v8M10.6 13.2c.8-.9 2-.9 2.8 0" stroke="#5d5a57" strokeWidth="1.6" strokeLinecap="round" fill="none" />
      )}
      <rect x="9.5" y="22" width="5" height="5.5" rx="1" fill={lit ? "#e9e1cf" : "#3a3836"} />
    </svg>
  );
}

/** A member's rank as a small coloured badge: numeral, and optionally the name. */
export function RankBadge({ tier, withName = true, className }: { tier: number; withName?: boolean; className?: string }) {
  const t = tierInfo(tier);
  const theme = THEMES[t.theme];
  return (
    <span
      className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-micro leading-tight", className)}
      style={{ color: theme.accent, background: theme.wash, boxShadow: `inset 0 0 0 1px ${theme.accent}33` }}
      title={`Tier ${t.numeral} · ${t.name}`}
    >
      <span className="font-display text-[0.95em] font-semibold">{t.numeral}</span>
      {withName ? <span>{t.name}</span> : <span className="sr-only">{t.name}</span>}
    </span>
  );
}
