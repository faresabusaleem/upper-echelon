import Link from "next/link";

export function Pager({ page, hasMore, href }: { page: number; hasMore: boolean; href: (p: number) => string }) {
  if (page === 1 && !hasMore) return null;
  return (
    <nav aria-label="Pages" className="mt-10 flex items-center justify-between">
      {page > 1 ? <Link href={href(page - 1)} className="text-ink underline hover:text-gold-bright">Newer</Link> : <span />}
      <span className="figure text-small text-muted">Page {page}</span>
      {hasMore ? <Link href={href(page + 1)} className="text-ink underline hover:text-gold-bright">Older</Link> : <span />}
    </nav>
  );
}
