import { cn, initials } from "@/lib/utils";

/** Round cameo portrait, or initials on a tone step when no image is set. */
export function Avatar({
  src,
  name,
  size = 40,
  className,
}: {
  src?: string | null;
  name: string;
  size?: number;
  className?: string;
}) {
  const style = { width: size, height: size };
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- small, already-optimised WebP from storage
      <img
        src={src}
        alt=""
        width={size}
        height={size}
        loading="lazy"
        decoding="async"
        className={cn("shrink-0 rounded-full bg-panel-2 object-cover", className)}
        style={style}
      />
    );
  }
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-panel-2 font-display text-ink-2",
        className,
      )}
      style={{ ...style, fontSize: Math.max(12, size * 0.4) }}
    >
      {initials(name)}
    </span>
  );
}
