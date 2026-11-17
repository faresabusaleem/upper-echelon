import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { CheckIcon, LockIcon, PinIcon, PollIcon } from "@/components/ui/icons";
import { THEMES, tierInfo } from "@/lib/tiers";
import { cn, slugify, timeAgo } from "@/lib/utils";

export type ThreadListItem = {
  id: number;
  title: string;
  tags: string[];
  is_pinned: boolean;
  is_locked: boolean;
  is_official: boolean;
  solved_post_id: number | null;
  score: number;
  reply_count: number;
  last_activity_at: string;
  created_at: string;
  removed_at: string | null;
  category_slug: string;
  category_name: string;
  author_username: string | null;
  author_name: string | null;
  author_avatar: string | null;
  author_tier?: number | null;
  last_reply_username?: string | null;
  last_reply_name: string | null;
  last_reply_avatar?: string | null;
  last_reply_tier?: number | null;
  has_poll: boolean;
  view_count?: number | null;
};

const colour = (tier?: number | null) => THEMES[tierInfo(tier ?? 1).theme].accent;

/** One thread in a room's list: who began it, how it is going, and who spoke last. */
export function ThreadRow({ t, showCategory = true }: { t: ThreadListItem; showCategory?: boolean }) {
  const url = `/forum/t/${t.id}/${slugify(t.title)}`;
  const lastName = t.last_reply_name ?? t.author_name;
  const lastUser = t.last_reply_username ?? (t.last_reply_name ? null : t.author_username);
  const lastAvatar = t.last_reply_name ? t.last_reply_avatar : t.author_avatar;
  const lastTier = t.last_reply_name ? t.last_reply_tier : t.author_tier;
  return (
    <li
      className={cn(
        "grid grid-cols-[2.5rem_minmax(0,1fr)] items-center gap-x-3.5 gap-y-1.5 px-4 py-3 transition-colors hover:bg-panel/60",
        "md:grid-cols-[2.5rem_minmax(0,1fr)_7.5rem_12.5rem]",
        t.is_pinned && "bg-gold-wash/30",
      )}
    >
      <Avatar src={t.author_avatar} name={t.author_name ?? "?"} size={40} className="row-span-2 md:row-span-1" />

      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
          {t.is_pinned && <PinIcon size={15} className="text-gold" aria-label="Pinned" />}
          {t.is_locked && <LockIcon size={15} className="text-muted" aria-label="Locked" />}
          {t.is_official && <span className="chip bg-gold-wash text-gold-bright">Official</span>}
          {t.solved_post_id && (
            <span className="chip bg-ok-wash text-ok">
              <CheckIcon size={12} /> Solved
            </span>
          )}
          {t.has_poll && (
            <span className="chip">
              <PollIcon size={12} /> Poll
            </span>
          )}
          {t.removed_at && <span className="chip bg-danger-wash text-danger">Removed</span>}
          <Link href={url} className="min-w-0 text-[0.98rem] font-medium leading-snug text-ink hover:text-gold-bright">
            {t.title}
          </Link>
        </p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-micro text-muted">
          {t.author_username ? (
            <Link href={`/u/${t.author_username}`} className="hover:underline" style={{ color: colour(t.author_tier) }}>
              {t.author_name}
            </Link>
          ) : (
            <span>A former member</span>
          )}
          <span aria-hidden>·</span>
          <time dateTime={t.created_at}>{timeAgo(t.created_at)}</time>
          {showCategory && (
            <>
              <span aria-hidden>·</span>
              <Link href={`/forum/c/${t.category_slug}`} className="hover:text-ink">
                {t.category_name}
              </Link>
            </>
          )}
          {t.tags.slice(0, 4).map((tag) => (
            <Link key={tag} href={`/forum/tags/${tag}`} className="chip px-1.5 py-0 hover:text-ink">
              #{tag}
            </Link>
          ))}
        </p>
      </div>

      <dl className="col-start-2 flex gap-4 text-micro md:col-start-3 md:grid md:grid-cols-[auto_auto] md:justify-end md:gap-x-2 md:gap-y-0.5">
        <dt className="text-muted md:text-right">Replies</dt>
        <dd className="figure -ml-3 text-ink md:ml-0 md:text-right">{t.reply_count.toLocaleString("en-GB")}</dd>
        <dt className="text-muted md:text-right">Views</dt>
        <dd className="figure -ml-3 text-ink md:ml-0 md:text-right">{Number(t.view_count ?? 0).toLocaleString("en-GB")}</dd>
      </dl>

      <div className="col-start-2 hidden min-w-0 items-center justify-end gap-2.5 text-right md:col-start-4 md:flex">
        <div className="min-w-0">
          <p className="text-micro text-muted">
            <time dateTime={t.last_activity_at}>{timeAgo(t.last_activity_at)}</time>
          </p>
          {lastUser ? (
            <Link href={`/u/${lastUser}`} className="block truncate text-small hover:underline" style={{ color: colour(lastTier) }}>
              {lastName}
            </Link>
          ) : (
            <span className="block truncate text-small text-ink-2">{lastName ?? "A former member"}</span>
          )}
        </div>
        <Avatar src={lastAvatar} name={lastName ?? "?"} size={28} />
      </div>
    </li>
  );
}

/** Column labels above a list of ThreadRows (desktop only). */
export function ThreadListHead() {
  return (
    <div className="hidden grid-cols-[2.5rem_minmax(0,1fr)_7.5rem_12.5rem] gap-x-3.5 border-b border-line px-4 py-2 text-micro uppercase tracking-[0.08em] text-faint md:grid">
      <span />
      <span>Thread</span>
      <span className="text-right">Replies · Views</span>
      <span className="text-right">Last message</span>
    </div>
  );
}
