import Link from "next/link";
import type { Metadata } from "next";
import { getViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ThreadRow, type ThreadListItem } from "@/components/forum/thread-row";
import { ForumSearch } from "@/components/forum/forum-search";
import { ButtonLink } from "@/components/ui/button";
import { Empty } from "@/components/ui/empty";
import { LockIcon } from "@/components/ui/icons";
import { tierInfo } from "@/lib/tiers";
import { timeAgo } from "@/lib/utils";

export const metadata: Metadata = {
  title: "The Forum",
  description: "Psychometrics, puzzles, mathematics, philosophy, science and books, argued with care.",
};

export default async function ForumPage() {
  const viewer = await getViewer();
  const supabase = await createClient();
  const [{ data: categories }, { data: overview }, { data: latest }, { data: tags }, { data: lounge }] = await Promise.all([
    supabase.from("forum_categories").select("*").order("position"),
    supabase.rpc("category_overview"),
    supabase.from("thread_list").select("*").is("removed_at", null).order("last_activity_at", { ascending: false }).limit(12),
    supabase.rpc("popular_tags", { lim: 24 }),
    supabase.from("forum_categories").select("id").eq("slug", "inner-room").maybeSingle(),
  ]);
  const stats = new Map((overview ?? []).map((o) => [o.category_id, o]));

  return (
    <div className="mx-auto w-full max-w-[96rem] px-[var(--gutter)] pb-10 pt-12 sm:pt-20">
      <div className="grid gap-10 lg:grid-cols-[1.2fr_1fr] lg:items-end">
        <div>
          <h1 className="font-display text-display-xl text-ink">The Forum</h1>
          <p className="mt-6 max-w-[48ch] text-lede text-ink-2">
            Arguments judged by their quality, not their volume. Read freely; members may write.
          </p>
        </div>
        <div className="flex flex-col gap-4">
          <ForumSearch />
          <div className="flex flex-wrap gap-3">
            {viewer?.profile.onboarded_at ? (
              <ButtonLink href="/forum/new">Start a thread</ButtonLink>
            ) : (
              <ButtonLink href="/join">Join to write</ButtonLink>
            )}
            {viewer && <ButtonLink href="/forum/bookmarks" variant="secondary">Bookmarks</ButtonLink>}
          </div>
        </div>
      </div>

      <div className="mt-16 grid gap-16 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
        <section aria-labelledby="rooms">
          <h2 id="rooms" className="font-display text-display-s text-ink">Rooms</h2>
          <ul className="mt-4 flex flex-col">
            {(categories ?? []).map((c) => {
              const s = stats.get(c.id);
              return (
                <li key={c.id}>
                  <Link href={`/forum/c/${c.slug}`} className="group grid grid-cols-[1fr_auto] gap-x-6 py-4 hover:bg-raised sm:px-3">
                    <span className="font-display text-[1.5rem] leading-tight text-ink group-hover:text-gold-bright">
                      {c.name}
                      {c.min_tier > 0 && <LockIcon size={16} className="ml-2 inline align-baseline text-gold" aria-label={`Tier ${tierInfo(c.min_tier).numeral} and above`} />}
                    </span>
                    <span className="figure text-right text-small text-ink-2">
                      {Number(s?.threads ?? 0)} <span className="font-sans text-muted">threads</span>
                    </span>
                    <span className="text-small text-ink-2">{c.description}</span>
                    <span className="text-right text-small text-muted">{s?.last_activity_at ? timeAgo(s.last_activity_at) : ""}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
          {!lounge && (
            <p className="mt-4 bg-raised px-4 py-3 text-small text-muted">
              <LockIcon size={16} className="mr-2 inline text-gold" />
              The Inner Room opens at the third tier, Fellow.
            </p>
          )}
        </section>

        <section aria-labelledby="latest">
          <h2 id="latest" className="font-display text-display-s text-ink">Lately</h2>
          {latest && latest.length > 0 ? (
            <ul className="mt-2 flex flex-col">
              {(latest as ThreadListItem[]).map((t) => (
                <ThreadRow key={t.id} t={t} />
              ))}
            </ul>
          ) : (
            <Empty className="mt-4" title="The room is quiet.">Start the first conversation.</Empty>
          )}
          {tags && tags.length > 0 && (
            <div className="mt-12">
              <h3 className="font-display text-xl text-ink">Tags</h3>
              <ul className="mt-4 flex flex-wrap gap-2">
                {tags.map((t) => (
                  <li key={t.tag}>
                    <Link href={`/forum/tags/${t.tag}`} className="bg-panel px-3 py-1.5 text-small text-ink-2 hover:bg-panel-2 hover:text-ink">
                      #{t.tag} <span className="figure text-muted">{Number(t.threads)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
