import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { ForumSearch } from "@/components/forum/forum-search";
import { Pager } from "@/components/forum/pager";
import { Empty } from "@/components/ui/empty";
import { timeAgo } from "@/lib/utils";

export const metadata: Metadata = { title: "Search the Forum", robots: { index: false } };

function Snippet({ text }: { text: string }) {
  const parts = text.split(/(\[\[.*?\]\])/g);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith("[[") ? (
          <mark key={i} className="bg-gold-wash text-gold-bright">{p.slice(2, -2)}</mark>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}

export default async function SearchPage({ searchParams }: PageProps<"/forum/search">) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 100) : "";
  const page = Math.max(1, Number(sp.page) || 1);
  const supabase = await createClient();
  const { data } = q ? await supabase.rpc("search_forum", { q, lim: 21, off: (page - 1) * 20 }) : { data: [] };
  const rows = data ?? [];
  return (
    <div className="mx-auto w-full max-w-4xl px-[var(--gutter)] pb-10 pt-10 sm:pt-14">
      <nav aria-label="Breadcrumb" className="text-small text-muted"><Link href="/forum" className="hover:text-ink">The Forum</Link></nav>
      <h1 className="mt-3 font-display text-display-l text-ink">Search</h1>
      <div className="mt-8"><ForumSearch defaultValue={q} /></div>
      {q && (
        <>
          <p className="mt-8 text-small text-muted" aria-live="polite">
            {rows.length === 0 ? "No results." : `Results for “${q}”`}
          </p>
          {rows.length > 0 ? (
            <ol className="mt-4 flex flex-col">
              {rows.slice(0, 20).map((r) => (
                <li key={`${r.thread_id}-${r.post_id ?? 0}`} className="py-4">
                  <Link href={`/forum/t/${r.thread_id}${r.post_id ? `#r${r.post_id}` : ""}`} className="font-display text-xl text-ink hover:text-gold-bright">
                    {r.title}
                  </Link>
                  <p className="mt-1 text-ink-2"><Snippet text={r.snippet} /></p>
                  <p className="mt-1 text-small text-muted">{r.post_id ? "Reply" : "Thread"} · {timeAgo(r.created_at)}</p>
                </li>
              ))}
            </ol>
          ) : (
            <Empty className="mt-4" title="Nothing found.">Try fewer or different words. Quotes search for an exact phrase; a minus sign excludes a word.</Empty>
          )}
          <Pager page={page} hasMore={rows.length > 20} href={(p) => `/forum/search?q=${encodeURIComponent(q)}&page=${p}`} />
        </>
      )}
    </div>
  );
}
