import Link from "next/link";
import type { Metadata } from "next";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { GAME_LIST, GAMES, dailyGame } from "@/lib/games/catalog";
import { nextTier, tierInfo, TIERS } from "@/lib/tiers";
import { describeNotification, type NotificationRow } from "@/lib/notifications";
import { ButtonLink } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Notice } from "@/components/ui/notice";
import { TierMark } from "@/components/ui/tier-mark";
import { timeAgo } from "@/lib/utils";

export const metadata: Metadata = { title: "Your desk", robots: { index: false } };

export default async function HomePage({ searchParams }: PageProps<"/home">) {
  const viewer = await requireViewer();
  const sp = await searchParams;
  const supabase = await createClient();
  const p = viewer.profile;
  const today = new Date().toISOString().slice(0, 10);
  const daily = GAMES[dailyGame()];

  const [bests, streak, longest, day, notes, threads, achievements, catalogue] = await Promise.all([
    supabase.from("game_bests").select("*").eq("user_id", viewer.id),
    supabase.rpc("current_streak", { uid: viewer.id }),
    supabase.rpc("longest_streak", { uid: viewer.id }),
    supabase.from("member_days").select("daily_done").eq("user_id", viewer.id).eq("day", today).maybeSingle(),
    supabase
      .from("notifications")
      .select("*, actor:profiles!notifications_actor_id_fkey(username, display_name, avatar_url)")
      .eq("user_id", viewer.id)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("threads")
      .select("id, title, reply_count, last_activity_at, category:forum_categories(name, slug)")
      .is("removed_at", null)
      .order("last_activity_at", { ascending: false })
      .limit(6),
    supabase.from("member_achievements").select("code, earned_at").eq("user_id", viewer.id).order("earned_at", { ascending: false }),
    supabase.from("achievements").select("*").order("position"),
  ]);

  const bestMap = new Map((bests.data ?? []).map((b) => [b.game, b]));
  const t = tierInfo(p.tier);
  const nt = nextTier(p.tier);
  const earned = new Set((achievements.data ?? []).map((a) => a.code));
  const dailyDone = !!day.data?.daily_done;

  return (
    <div className="mx-auto w-full max-w-[96rem] px-[var(--gutter)] pb-10 pt-10 sm:pt-16">
      {sp.password === "updated" && <Notice tone="success" className="mb-8">Your password has been changed.</Notice>}
      <div className="grid gap-12 lg:grid-cols-[1.3fr_1fr]">
        <section aria-labelledby="standing">
          <p className="text-small text-muted">Your desk</p>
          <h1 id="standing" className="mt-2 font-display text-display-l text-ink">
            {p.display_name}
          </h1>
          <div className="mt-8 flex flex-wrap items-baseline gap-x-6 gap-y-2">
            <TierMark tier={p.tier} withName className="text-[2rem]" />
            <p className="text-ink-2">
              <span className="figure text-ink">{p.echelon_score}</span> of 1,000
            </p>
          </div>
          <div className="mt-6 max-w-xl">
            {nt ? (
              <>
                <Progress
                  value={p.echelon_score - t.threshold}
                  max={nt.threshold - t.threshold}
                  label={`Progress to ${nt.name}`}
                />
                <p className="mt-3 text-small text-muted">
                  {nt.threshold - p.echelon_score} more to {nt.numeral} · {nt.name}
                </p>
              </>
            ) : (
              <p className="text-gold-bright">The highest tier. There is nothing above you but the work.</p>
            )}
          </div>
          <dl className="mt-10 grid max-w-xl grid-cols-3 gap-6">
            {[
              ["Mind", p.mind_score, 500],
              ["Practice", p.practice_score, 250],
              ["Voice", p.voice_score, 250],
            ].map(([label, v, max]) => (
              <div key={label as string}>
                <dt className="text-small text-muted">{label}</dt>
                <dd className="mt-1 figure text-xl text-ink">
                  {v}
                  <span className="text-small text-muted"> / {max}</span>
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <section aria-labelledby="today" className="bg-gold-wash p-6 sm:p-8">
          <h2 id="today" className="font-display text-display-s text-ink">
            Today: {daily.name}
          </h2>
          <p className="mt-2 text-ink-2">{dailyDone ? "Done. Return tomorrow to keep the streak." : daily.line}</p>
          <dl className="mt-6 flex gap-10">
            <div>
              <dt className="text-small text-muted">Streak</dt>
              <dd className="figure text-3xl text-ink">{streak.data ?? 0}</dd>
            </div>
            <div>
              <dt className="text-small text-muted">Longest</dt>
              <dd className="figure text-3xl text-ink">{longest.data ?? 0}</dd>
            </div>
          </dl>
          <ButtonLink href={`/arena/${daily.slug}`} className="mt-6" variant={dailyDone ? "secondary" : "primary"}>
            {dailyDone ? "Play again" : "Take today’s trial"}
          </ButtonLink>
        </section>
      </div>

      <div className="mt-20 grid gap-16 lg:grid-cols-[1.3fr_1fr]">
        <section aria-labelledby="bests">
          <div className="flex items-baseline justify-between">
            <h2 id="bests" className="font-display text-display-s text-ink">
              Your eight trials
            </h2>
            <Link href="/arena" className="text-small text-ink-2 underline hover:text-ink">
              The Arena
            </Link>
          </div>
          <table className="mt-6 w-full text-left">
            <caption className="sr-only">Personal bests and ratings</caption>
            <thead className="text-small text-muted">
              <tr>
                <th scope="col" className="pb-3 font-normal">Trial</th>
                <th scope="col" className="pb-3 text-right font-normal">Best</th>
                <th scope="col" className="hidden pb-3 pl-6 font-normal sm:table-cell">Rating</th>
              </tr>
            </thead>
            <tbody>
              {GAME_LIST.map((g) => {
                const b = bestMap.get(g.kind);
                return (
                  <tr key={g.kind} className="even:bg-raised">
                    <th scope="row" className="py-3 pl-2 font-normal">
                      <Link href={`/arena/${g.slug}`} className="text-ink hover:text-gold-bright">
                        {g.name}
                      </Link>
                    </th>
                    <td className="figure py-3 text-right text-ink">
                      {b ? `${Number(b.best_score).toFixed(g.decimals)} ${g.unit}` : <span className="text-muted">—</span>}
                    </td>
                    <td className="hidden w-48 py-3 pl-6 pr-2 sm:table-cell">
                      {b ? <Progress value={b.best_rating} label={`${g.name} rating`} /> : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>

        <div className="flex flex-col gap-16">
          <section aria-labelledby="notes">
            <div className="flex items-baseline justify-between">
              <h2 id="notes" className="font-display text-display-s text-ink">
                Notices
              </h2>
              <Link href="/notifications" className="text-small text-ink-2 underline hover:text-ink">
                All
              </Link>
            </div>
            {notes.data && notes.data.length > 0 ? (
              <ul className="mt-4 flex flex-col">
                {(notes.data as unknown as NotificationRow[]).map((n) => {
                  const d = describeNotification(n);
                  return (
                    <li key={n.id}>
                      <Link href={d.href} className="flex justify-between gap-4 py-3 hover:bg-raised">
                        <span className={n.read_at ? "text-ink-2" : "text-ink"}>{d.text}</span>
                        <span className="shrink-0 text-small text-muted">{timeAgo(n.created_at)}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="mt-4 text-muted">Nothing yet. Replies, mentions and new followers will appear here.</p>
            )}
          </section>
          <section aria-labelledby="latest">
            <div className="flex items-baseline justify-between">
              <h2 id="latest" className="font-display text-display-s text-ink">
                In the Forum
              </h2>
              <Link href="/forum" className="text-small text-ink-2 underline hover:text-ink">
                Forum
              </Link>
            </div>
            {threads.data && threads.data.length > 0 ? (
              <ul className="mt-4 flex flex-col">
                {threads.data.map((th) => (
                  <li key={th.id}>
                    <Link href={`/forum/t/${th.id}`} className="block py-3 hover:bg-raised">
                      <span className="text-ink">{th.title}</span>
                      <span className="mt-0.5 block text-small text-muted">
                        {th.category?.name} · {th.reply_count} {th.reply_count === 1 ? "reply" : "replies"} · {timeAgo(th.last_activity_at)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-muted">The Forum is quiet. Start the first conversation.</p>
            )}
          </section>
        </div>
      </div>

      <section id="achievements" aria-labelledby="ach" className="mt-20">
        <h2 id="ach" className="font-display text-display-s text-ink">
          Marks
        </h2>
        <p className="mt-2 text-muted">
          {earned.size} of {catalogue.data?.length ?? 0} earned. Choose which to show on your profile in{" "}
          <Link href="/settings/profile" className="text-ink underline">
            settings
          </Link>
          .
        </p>
        <ul className="mt-8 grid gap-x-10 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
          {(catalogue.data ?? []).map((a) => (
            <li key={a.code} className={earned.has(a.code) ? "" : "opacity-50"}>
              <p className="flex items-center gap-2 text-ink">
                <span aria-hidden className={`inline-block size-2 ${earned.has(a.code) ? "bg-gold" : "bg-panel-3"}`} />
                {a.name}
                <span className="sr-only">{earned.has(a.code) ? "(earned)" : "(not yet earned)"}</span>
              </p>
              <p className="mt-1 text-small text-muted">{a.description}</p>
            </li>
          ))}
        </ul>
        <p className="mt-10 text-small text-muted">
          Tiers: {TIERS.map((x) => `${x.numeral} ${x.name} (${x.threshold})`).join(" · ")}.{" "}
          <Link href="/about#ranks" className="text-ink underline">
            How the score works
          </Link>
        </p>
      </section>
    </div>
  );
}
