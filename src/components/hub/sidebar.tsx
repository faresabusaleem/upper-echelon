import Link from "next/link";
import { getViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { GAMES, dailyGame } from "@/lib/games/catalog";
import { ButtonLink } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Sigil } from "@/components/ui/sigils";
import { Skeleton } from "@/components/ui/skeleton";
import { THEMES, tierInfo } from "@/lib/tiers";
import { slugify, timeAgo } from "@/lib/utils";
import { Circle, type Shout } from "./circle";

type Online = {
  members: number;
  guests: number;
  list: Array<{ username: string; display_name: string; avatar_url: string | null; tier: number; role: string }>;
};
type Stats = { threads: number; messages: number; members: number; newest: { username: string; display_name: string } | null };

export function tierColor(tier: number) {
  return THEMES[tierInfo(tier).theme].accent;
}

export async function HubSidebar() {
  const viewer = await getViewer();
  const supabase = await createClient();
  const [{ data: onlineRaw }, { data: statsRaw }, { data: latest }, { data: shouts }, hidden] = await Promise.all([
    supabase.rpc("online_now", { lim: 30 }),
    supabase.rpc("forum_stats"),
    supabase
      .from("thread_list")
      .select("id, title, last_activity_at, last_reply_name, author_name, reply_count, category_name")
      .is("removed_at", null)
      .order("last_activity_at", { ascending: false })
      .limit(6),
    supabase
      .from("shouts")
      .select("id, body, created_at, author_id, author:profiles!shouts_author_id_fkey(id, username, display_name, avatar_url, tier, role, is_staff)")
      .is("removed_at", null)
      .order("created_at", { ascending: false })
      .limit(40),
    viewer
      ? Promise.all([
          supabase.from("blocks").select("blocked_id").eq("blocker_id", viewer.id),
          supabase.from("mutes").select("muted_id").eq("muter_id", viewer.id),
        ])
      : null,
  ]);
  const online = (onlineRaw ?? { members: 0, guests: 0, list: [] }) as unknown as Online;
  const stats = (statsRaw ?? { threads: 0, messages: 0, members: 0, newest: null }) as unknown as Stats;
  const hiddenIds = hidden ? [...(hidden[0].data ?? []).map((b) => b.blocked_id), ...(hidden[1].data ?? []).map((m) => m.muted_id)] : [];
  const rite = GAMES[dailyGame()];
  const canSpeak = !!viewer?.profile.onboarded_at && !viewer.ban && !viewer.mute;

  return (
    <>
      {!viewer && (
        <section className="panel relative overflow-hidden p-5">
          <div aria-hidden className="pointer-events-none absolute -right-6 -top-6 text-gold/10">
            <Sigil name="eye" size={140} strokeWidth={1} />
          </div>
          <p className="font-display text-[1.6rem] leading-tight text-ink">Join the society.</p>
          <p className="mt-2 text-small text-ink-2">
            Keep your scores, climb six ranks, speak in the Circle and open the Inner Sanctum.
          </p>
          <div className="mt-4 flex items-center gap-3">
            <ButtonLink href="/join" size="sm">Begin your initiation</ButtonLink>
            <Link href="/login" className="text-small text-ink-2 hover:text-ink">Sign in</Link>
          </div>
        </section>
      )}

      <Circle
        initial={((shouts ?? []) as unknown as Shout[]).reverse()}
        viewer={viewer ? { id: viewer.id, canSpeak, isModerator: viewer.isModerator, onboarded: !!viewer.profile.onboarded_at } : null}
        hiddenIds={hiddenIds}
      />

      <section className="panel" aria-labelledby="rite-h">
        <h2 id="rite-h" className="panel-head">
          Today&rsquo;s rite <small>resets 00:00 UTC</small>
        </h2>
        <Link href={`/arena/${rite.slug}`} className="group flex items-center gap-3 px-4 py-3.5 hover:bg-panel">
          <span className="inline-flex size-10 items-center justify-center rounded-xl bg-gold-wash text-gold">
            <Sigil name="candle" size={22} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-ink group-hover:text-gold-bright">{rite.name}</span>
            <span className="block truncate text-micro text-muted">{rite.line}</span>
          </span>
          <span aria-hidden className="text-gold">→</span>
        </Link>
      </section>

      <section className="panel" aria-labelledby="here-h">
        <h2 id="here-h" className="panel-head">
          Present now
          <small>
            {online.members} {online.members === 1 ? "member" : "members"} · {online.guests} {online.guests === 1 ? "visitor" : "visitors"}
          </small>
        </h2>
        <div className="px-4 py-3.5">
          {online.list.length > 0 ? (
            <ul className="flex flex-wrap gap-x-1.5 gap-y-1 text-small">
              {online.list.map((m, i) => (
                <li key={m.username}>
                  <Link href={`/u/${m.username}`} className="hover:underline" style={{ color: tierColor(m.tier) }}>
                    {m.display_name}
                  </Link>
                  {i < online.list.length - 1 && <span className="text-faint">,</span>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-small text-muted">No members are showing right now. The candles are lit anyway.</p>
          )}
          <p className="mt-3 text-micro text-faint">In the last 15 minutes. Members can hide themselves in settings.</p>
        </div>
      </section>

      <section className="panel" aria-labelledby="latest-h">
        <h2 id="latest-h" className="panel-head">Latest in the halls</h2>
        {latest && latest.length > 0 ? (
          <ul className="rows">
            {latest.map((t) => (
              <li key={t.id}>
                <Link href={`/forum/t/${t.id}/${slugify(t.title)}`} className="block px-4 py-2.5 hover:bg-panel">
                  <span className="line-clamp-2 text-small text-ink">{t.title}</span>
                  <span className="mt-0.5 block text-micro text-muted">
                    {t.last_reply_name ?? t.author_name ?? "A former member"} · {timeAgo(t.last_activity_at)} · {t.category_name}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-4 py-3.5 text-small text-muted">Nothing yet.</p>
        )}
      </section>

      <section className="panel" aria-labelledby="stats-h">
        <h2 id="stats-h" className="panel-head">The society</h2>
        <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1.5 px-4 py-3.5 text-small">
          <dt className="text-muted">Threads</dt>
          <dd className="figure text-right text-ink">{Number(stats.threads).toLocaleString("en-GB")}</dd>
          <dt className="text-muted">Messages</dt>
          <dd className="figure text-right text-ink">{Number(stats.messages).toLocaleString("en-GB")}</dd>
          <dt className="text-muted">Members</dt>
          <dd className="figure text-right text-ink">{Number(stats.members).toLocaleString("en-GB")}</dd>
          {stats.newest && (
            <>
              <dt className="text-muted">Newest</dt>
              <dd className="text-right">
                <Link href={`/u/${stats.newest.username}`} className="text-gold-bright hover:underline">
                  {stats.newest.display_name}
                </Link>
              </dd>
            </>
          )}
        </dl>
      </section>
    </>
  );
}

export function SidebarSkeleton() {
  return (
    <>
      <Skeleton className="h-80 rounded-[14px]" />
      <Skeleton className="h-28 rounded-[14px]" />
      <Skeleton className="h-36 rounded-[14px]" />
    </>
  );
}

/** A member's name in their rank colour, with an optional small portrait. */
export function MemberName({
  username,
  name,
  tier,
  avatar,
  size = 20,
}: {
  username: string | null;
  name: string | null;
  tier: number | null;
  avatar?: string | null;
  size?: number;
}) {
  if (!username) return <span className="text-muted">A former member</span>;
  return (
    <Link href={`/u/${username}`} className="inline-flex items-center gap-1.5 hover:underline" style={{ color: tierColor(tier ?? 1) }}>
      {avatar !== undefined && <Avatar src={avatar} name={name ?? username} size={size} />}
      <span>{name ?? username}</span>
    </Link>
  );
}
