import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { GAMES, GAME_LIST, isGameKind, type GameKind } from "@/lib/games/catalog";
import { THEMES, tierInfo, type ProfileTheme } from "@/lib/tiers";
import { Avatar } from "@/components/ui/avatar";
import { StaffMark, TierMark } from "@/components/ui/tier-mark";
import { ProfileActions } from "@/components/social/profile-actions";
import { formatDate, ordinal, timeAgo } from "@/lib/utils";
import { cn } from "@/lib/utils";

type Props = PageProps<"/u/[username]">;

const SCALES: Record<string, string> = {
  iq15: "IQ (SD 15)",
  iq16: "IQ (SD 16)",
  iq24: "IQ (SD 24)",
  raw: "raw score",
  percentile: "percentile",
};

async function load(username: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("*").eq("username", username).maybeSingle();
  return data;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  const p = await load(decodeURIComponent(username));
  if (!p) return { title: "Member not found" };
  const t = tierInfo(p.tier);
  return {
    title: `${p.display_name} (@${p.username})`,
    description: p.bio?.slice(0, 160) || `${p.display_name} is a ${t.name} of Upper Echelon.`,
  };
}

export default async function ProfilePage({ params, searchParams }: Props) {
  const { username } = await params;
  const sp = await searchParams;
  const tab = typeof sp.tab === "string" ? sp.tab : "overview";
  const p = await load(decodeURIComponent(username));
  if (!p) notFound();

  const viewer = await getViewer();
  const supabase = await createClient();
  const isSelf = viewer?.id === p.id;

  const [counts, followRow, blockRow, muteRow, canMsg, bests, results, earned, catalogue, activity, sanctions] = await Promise.all([
    supabase.rpc("follow_counts", { uid: p.id }),
    viewer && !isSelf
      ? supabase.from("follows").select("follower_id").eq("follower_id", viewer.id).eq("followee_id", p.id).maybeSingle()
      : Promise.resolve({ data: null }),
    viewer && !isSelf
      ? supabase.from("blocks").select("blocker_id").eq("blocker_id", viewer.id).eq("blocked_id", p.id).maybeSingle()
      : Promise.resolve({ data: null }),
    viewer && !isSelf
      ? supabase.from("mutes").select("muter_id").eq("muter_id", viewer.id).eq("muted_id", p.id).maybeSingle()
      : Promise.resolve({ data: null }),
    viewer && !isSelf ? supabase.rpc("can_message", { sender: viewer.id, recipient: p.id }) : Promise.resolve({ data: false }),
    supabase.from("game_bests").select("*").eq("user_id", p.id),
    supabase
      .from("test_results")
      .select("*, test:directory_tests(name, slug, score_scale)")
      .eq("user_id", p.id)
      .order("created_at", { ascending: false }),
    supabase.from("member_achievements").select("code, earned_at").eq("user_id", p.id),
    supabase.from("achievements").select("*").order("position"),
    supabase.rpc("member_activity", { uid: p.id, lim: 30 }),
    supabase.from("sanctions").select("kind").eq("user_id", p.id).is("revoked_at", null).eq("kind", "ban").limit(1),
  ]);

  const followCounts = Array.isArray(counts.data) ? counts.data[0] : null;
  const theme = THEMES[(p.theme as ProfileTheme) ?? "pewter"] ?? THEMES.pewter;
  const t = tierInfo(p.tier);
  const bestRows = bests.data ?? [];
  const statsVisible = isSelf || bestRows.length > 0 || false;
  const earnedSet = new Set((earned.data ?? []).map((e) => e.code));
  const showcase = (p.showcase_badges.length ? p.showcase_badges : [...earnedSet].slice(0, 6))
    .filter((c) => earnedSet.has(c))
    .map((c) => catalogue.data?.find((a) => a.code === c))
    .filter(Boolean);
  const showcaseGames: GameKind[] = (p.showcase_games.length ? p.showcase_games : bestRows.map((b) => b.game)).filter(isGameKind).slice(0, 4);

  // Proof screenshots are private; mint short-lived links only for results this viewer may see.
  const admin = createAdminClient();
  const visibleResults = await Promise.all(
    (results.data ?? []).map(async (r) => {
      let proofUrl: string | null = null;
      if (r.proof_path) {
        const { data } = await admin.storage.from("proofs").createSignedUrl(r.proof_path, 600);
        proofUrl = data?.signedUrl ?? null;
      }
      return { ...r, proofUrl };
    }),
  );

  const percentiles = new Map<string, number | null>();
  await Promise.all(
    bestRows
      .filter((b) => showcaseGames.includes(b.game))
      .map(async (b) => {
        const { data } = await supabase.rpc("game_percentile", { g: b.game, s: Number(b.best_score) });
        percentiles.set(b.game, data == null ? null : Number(data));
      }),
  );

  const links = (Array.isArray(p.links) ? p.links : []) as Array<{ label?: string; url?: string }>;
  const banned = (sanctions.data ?? []).length > 0;

  return (
    <div style={{ ["--color-gold" as string]: theme.accent }}>
      <div
        className="relative h-44 w-full bg-cover bg-center sm:h-64"
        style={{ backgroundColor: theme.wash, backgroundImage: p.banner_url ? `url(${p.banner_url})` : undefined }}
        role={p.banner_url ? "img" : undefined}
        aria-label={p.banner_url ? `${p.display_name}'s banner` : undefined}
      />
      <div className="mx-auto w-full max-w-[96rem] px-[var(--gutter)]">
        <div className="-mt-14 flex flex-col gap-6 sm:-mt-20 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end">
            <Avatar src={p.avatar_url} name={p.display_name} size={136} className="ring-8 ring-ground" />
            <div className="pb-1">
              <h1 className="font-display text-display-m leading-none text-ink">{p.display_name}</h1>
              <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-ink-2">
                <span>@{p.username}</span>
                {p.pronouns && <span className="text-muted">{p.pronouns}</span>}
                <TierMark tier={p.tier} withName />
                {p.is_staff && <StaffMark />}
                {p.role !== "member" && !p.is_staff && <span className="text-small text-muted">{p.role === "admin" ? "Administrator" : "Moderator"}</span>}
              </p>
            </div>
          </div>
          <ProfileActions
            targetId={p.id}
            username={p.username as string}
            isSelf={isSelf}
            isMember={!!viewer?.profile.onboarded_at}
            following={!!followRow.data}
            blocked={!!blockRow.data}
            muted={!!muteRow.data}
            canMessage={!!canMsg.data}
          />
        </div>

        {banned && <p className="mt-6 bg-danger-wash px-4 py-3 text-small text-danger">This account is suspended.</p>}

        <div className="mt-10 grid gap-12 lg:grid-cols-[minmax(0,22rem)_1fr]">
          <aside className="flex flex-col gap-6 text-ink-2">
            {p.bio ? <p className="whitespace-pre-line text-ink">{p.bio}</p> : isSelf ? <p className="text-muted">Add a few words about yourself in settings.</p> : null}
            <dl className="flex flex-col gap-2 text-small">
              {p.location && (
                <div className="flex gap-2">
                  <dt className="text-muted">Based in</dt>
                  <dd>{p.location}</dd>
                </div>
              )}
              <div className="flex gap-2">
                <dt className="text-muted">Joined</dt>
                <dd>{formatDate(p.created_at)}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-muted">Echelon score</dt>
                <dd className="figure text-ink">{p.echelon_score}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-muted">Reputation</dt>
                <dd className="figure text-ink">{p.reputation}</dd>
              </div>
            </dl>
            {followCounts ? (
              <p className="flex gap-6 text-small">
                <Link href={`/u/${p.username}?tab=followers`} className="hover:text-ink">
                  <span className="figure text-ink">{followCounts.followers}</span> followers
                </Link>
                <Link href={`/u/${p.username}?tab=following`} className="hover:text-ink">
                  <span className="figure text-ink">{followCounts.following}</span> following
                </Link>
              </p>
            ) : (
              <p className="text-small text-muted">Followers are private.</p>
            )}
            {p.interests.length > 0 && (
              <ul className="flex flex-wrap gap-2" aria-label="Interests">
                {p.interests.map((i) => (
                  <li key={i} className="bg-panel px-3 py-1 text-small text-ink-2">
                    {i}
                  </li>
                ))}
              </ul>
            )}
            {links.length > 0 && (
              <ul className="flex flex-col gap-1 text-small">
                {links
                  .filter((l) => typeof l.url === "string" && /^https?:\/\//.test(l.url))
                  .map((l) => (
                    <li key={l.url}>
                      <a href={l.url} rel="nofollow noopener ugc" target="_blank" className="text-ink underline hover:text-gold">
                        {l.label || l.url!.replace(/^https?:\/\//, "")}
                      </a>
                    </li>
                  ))}
              </ul>
            )}
          </aside>

          <div className="min-w-0">
            <nav aria-label="Profile sections" className="flex gap-6 overflow-x-auto pb-1 text-[1.0625rem]">
              {[
                ["overview", "Overview"],
                ["posts", "Writing"],
                ["followers", "Followers"],
                ["following", "Following"],
              ].map(([key, label]) => (
                <Link
                  key={key}
                  href={key === "overview" ? `/u/${p.username}` : `/u/${p.username}?tab=${key}`}
                  aria-current={tab === key ? "page" : undefined}
                  className={cn(
                    "shrink-0 pb-1",
                    tab === key ? "text-ink underline decoration-gold decoration-2 underline-offset-[0.45em]" : "text-muted hover:text-ink",
                  )}
                >
                  {label}
                </Link>
              ))}
            </nav>

            {tab === "overview" && (
              <div className="mt-10 flex flex-col gap-16">
                {showcase.length > 0 && (
                  <section aria-labelledby="marks">
                    <h2 id="marks" className="font-display text-display-s text-ink">
                      Marks
                    </h2>
                    <ul className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                      {showcase.map((a) => (
                        <li key={a!.code} className="bg-raised px-4 py-3">
                          <p className="flex items-center gap-2 text-ink">
                            <span aria-hidden className="inline-block size-2 bg-gold" />
                            {a!.name}
                          </p>
                          <p className="mt-1 text-small text-muted">{a!.description}</p>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                <section aria-labelledby="trials">
                  <h2 id="trials" className="font-display text-display-s text-ink">
                    In the Arena
                  </h2>
                  {statsVisible && bestRows.length > 0 ? (
                    <>
                      <ul className="mt-5 grid gap-4 sm:grid-cols-2">
                        {showcaseGames.map((g) => {
                          const b = bestRows.find((r) => r.game === g)!;
                          if (!b) return null;
                          const pct = percentiles.get(g);
                          return (
                            <li key={g} className="bg-raised px-5 py-4">
                              <p className="text-small text-muted">{GAMES[g].name}</p>
                              <p className="figure mt-1 text-3xl text-ink">
                                {Number(b.best_score).toFixed(GAMES[g].decimals)} <span className="text-base text-muted">{GAMES[g].unit}</span>
                              </p>
                              {pct != null && <p className="mt-1 text-small text-ink-2">{ordinal(pct)} percentile among members</p>}
                            </li>
                          );
                        })}
                      </ul>
                      <p className="mt-4 text-small text-muted">
                        {bestRows.length} of {GAME_LIST.length} trials played.
                      </p>
                    </>
                  ) : (
                    <p className="mt-4 text-muted">{isSelf ? "Play a trial to start your record." : "Arena results are private or not yet recorded."}</p>
                  )}
                </section>

                <section aria-labelledby="tests">
                  <h2 id="tests" className="font-display text-display-s text-ink">
                    Logged test results
                  </h2>
                  {visibleResults.length > 0 ? (
                    <ul className="mt-5 flex flex-col">
                      {visibleResults.map((r) => (
                        <li key={r.id} className={cn("flex flex-wrap items-baseline justify-between gap-4 py-3", r.is_hidden && "opacity-60")}>
                          <div>
                            <Link href={`/directory/${r.test?.slug}`} className="text-ink hover:text-gold">
                              {r.test?.name}
                            </Link>
                            <p className="text-small text-muted">
                              Self-reported{r.taken_on ? ` · taken ${formatDate(r.taken_on)}` : ""}
                              {r.is_hidden ? " · hidden from others" : ""}
                              {r.proofUrl && (
                                <>
                                  {" · "}
                                  <a href={r.proofUrl} target="_blank" rel="noopener" className="underline hover:text-ink">
                                    proof
                                  </a>
                                </>
                              )}
                            </p>
                          </div>
                          <p className="figure text-xl text-ink">
                            {Number(r.score)} <span className="text-small text-muted">{SCALES[r.scale] ?? r.scale}</span>
                          </p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-4 text-muted">{isSelf ? "Log a result from any test in the Directory." : "No results shown."}</p>
                  )}
                </section>

                <section aria-labelledby="activity">
                  <h2 id="activity" className="font-display text-display-s text-ink">
                    Recent activity
                  </h2>
                  {activity.data && activity.data.length > 0 ? (
                    <ul className="mt-5 flex flex-col">
                      {activity.data.map((a, idx) => (
                        <li key={`${a.kind}-${a.ref}-${idx}`} className="flex flex-wrap justify-between gap-x-6 py-3">
                          <ActivityLine kind={a.kind} refId={a.ref} title={a.title} detail={a.detail} />
                          <span className="text-small text-muted">{timeAgo(a.created_at)}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-4 text-muted">Nothing to show yet.</p>
                  )}
                </section>
                <p className="text-small text-muted">
                  {t.numeral} · {t.name}. Profile theme: {theme.label}.
                </p>
              </div>
            )}

            {tab === "posts" && <MemberPosts userId={p.id} />}
            {(tab === "followers" || tab === "following") &&
              (followCounts ? <FollowList userId={p.id} mode={tab} /> : <p className="mt-10 text-muted">This member keeps their connections private.</p>)}
          </div>
        </div>
      </div>
    </div>
  );
}

function ActivityLine({ kind, refId, title, detail }: { kind: string; refId: string; title: string; detail: string | null }) {
  switch (kind) {
    case "thread":
      return (
        <span className="text-ink-2">
          Started <Link href={`/forum/t/${refId}`} className="text-ink hover:text-gold">{title}</Link>
          {detail ? <span className="text-muted"> in {detail}</span> : null}
        </span>
      );
    case "reply": {
      const [thread, post] = refId.split("#");
      return (
        <span className="text-ink-2">
          Replied in <Link href={`/forum/t/${thread}#r${post}`} className="text-ink hover:text-gold">{title}</Link>
        </span>
      );
    }
    case "achievement":
      return <span className="text-ink-2">Earned the mark <span className="text-ink">{title}</span></span>;
    case "tier":
      return <span className="text-ink-2">Rose to <span className="text-gold">{title}</span></span>;
    case "best": {
      const g = isGameKind(refId) ? GAMES[refId] : null;
      return (
        <span className="text-ink-2">
          Best in {g?.name ?? title}: <span className="figure text-ink">{Number(detail).toFixed(g?.decimals ?? 0)} {g?.unit}</span>
        </span>
      );
    }
    default:
      return <span className="text-ink-2">{title}</span>;
  }
}

async function MemberPosts({ userId }: { userId: string }) {
  const supabase = await createClient();
  const [{ data: threads }, { data: replies }] = await Promise.all([
    supabase
      .from("threads")
      .select("id, title, created_at, reply_count, score, category:forum_categories(name)")
      .eq("author_id", userId)
      .is("removed_at", null)
      .order("created_at", { ascending: false })
      .limit(30),
    supabase
      .from("posts")
      .select("id, thread_id, body, created_at, score, thread:threads(title)")
      .eq("author_id", userId)
      .is("removed_at", null)
      .order("created_at", { ascending: false })
      .limit(30),
  ]);
  return (
    <div className="mt-10 grid gap-14 xl:grid-cols-2">
      <section aria-labelledby="threads-h">
        <h2 id="threads-h" className="font-display text-display-s text-ink">Threads</h2>
        {threads && threads.length ? (
          <ul className="mt-4 flex flex-col">
            {threads.map((t) => (
              <li key={t.id} className="py-3">
                <Link href={`/forum/t/${t.id}`} className="text-ink hover:text-gold">{t.title}</Link>
                <p className="text-small text-muted">
                  {t.category?.name} · {t.reply_count} replies · {t.score} upvotes · {timeAgo(t.created_at)}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-muted">No threads yet.</p>
        )}
      </section>
      <section aria-labelledby="replies-h">
        <h2 id="replies-h" className="font-display text-display-s text-ink">Replies</h2>
        {replies && replies.length ? (
          <ul className="mt-4 flex flex-col">
            {replies.map((r) => (
              <li key={r.id} className="py-3">
                <Link href={`/forum/t/${r.thread_id}#r${r.id}`} className="text-ink hover:text-gold">{r.thread?.title}</Link>
                <p className="line-clamp-2 text-small text-ink-2">{r.body.slice(0, 220)}</p>
                <p className="text-small text-muted">{timeAgo(r.created_at)}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-muted">No replies yet.</p>
        )}
      </section>
    </div>
  );
}

async function FollowList({ userId, mode }: { userId: string; mode: "followers" | "following" }) {
  const supabase = await createClient();
  const query =
    mode === "followers"
      ? supabase
          .from("follows")
          .select("created_at, person:profiles!follows_follower_id_fkey(username, display_name, avatar_url, tier)")
          .eq("followee_id", userId)
      : supabase
          .from("follows")
          .select("created_at, person:profiles!follows_followee_id_fkey(username, display_name, avatar_url, tier)")
          .eq("follower_id", userId);
  const { data } = await query.order("created_at", { ascending: false }).limit(100);
  if (!data || data.length === 0) return <p className="mt-10 text-muted">No one here yet.</p>;
  return (
    <ul className="mt-8 grid gap-2 sm:grid-cols-2">
      {data.map((f) =>
        f.person ? (
          <li key={f.person.username as string}>
            <Link href={`/u/${f.person.username}`} className="flex items-center gap-3 px-2 py-2 hover:bg-raised">
              <Avatar src={f.person.avatar_url} name={f.person.display_name} size={40} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-ink">{f.person.display_name}</span>
                <span className="block text-small text-muted">@{f.person.username}</span>
              </span>
              <TierMark tier={f.person.tier} />
            </Link>
          </li>
        ) : null,
      )}
    </ul>
  );
}
