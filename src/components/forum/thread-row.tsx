import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { CheckIcon, LockIcon, PinIcon } from "@/components/ui/icons";
import { slugify, timeAgo } from "@/lib/utils";

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
  last_reply_name: string | null;
  has_poll: boolean;
};

export function ThreadRow({ t, showCategory = true }: { t: ThreadListItem; showCategory?: boolean }) {
  return (
    <li className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 py-5 sm:grid-cols-[auto_1fr_auto] sm:px-3">
      <Avatar src={t.author_avatar} name={t.author_name ?? "?"} size={40} className="row-span-2 mt-0.5" />
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
          {t.is_pinned && <PinIcon size={16} className="text-gold" aria-label="Pinned" />}
          {t.is_locked && <LockIcon size={16} className="text-muted" aria-label="Locked" />}
          <Link href={`/forum/t/${t.id}/${slugify(t.title)}`} className="font-display text-[1.375rem] leading-snug text-ink hover:text-gold-bright">
            {t.title}
          </Link>
          {t.solved_post_id && (
            <span className="inline-flex items-center gap-1 bg-ok-wash px-2 py-0.5 text-micro text-ok">
              <CheckIcon size={14} /> Solved
            </span>
          )}
          {t.is_official && <span className="bg-gold-wash px-2 py-0.5 text-micro text-gold-bright">Official</span>}
          {t.has_poll && <span className="bg-panel-2 px-2 py-0.5 text-micro text-ink-2">Poll</span>}
          {t.removed_at && <span className="bg-danger-wash px-2 py-0.5 text-micro text-danger">Removed</span>}
        </p>
        <p className="mt-1 text-small text-muted">
          {t.author_name ? (
            <Link href={`/u/${t.author_username}`} className="text-ink-2 hover:text-ink">{t.author_name}</Link>
          ) : (
            "A former member"
          )}
          {showCategory && (
            <>
              {" in "}
              <Link href={`/forum/c/${t.category_slug}`} className="text-ink-2 hover:text-ink">{t.category_name}</Link>
            </>
          )}
          {" · "}
          {t.last_reply_name ? `last reply by ${t.last_reply_name} ${timeAgo(t.last_activity_at)}` : timeAgo(t.created_at)}
        </p>
        {t.tags.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Tags">
            {t.tags.map((tag) => (
              <li key={tag}>
                <Link href={`/forum/tags/${tag}`} className="bg-panel px-2 py-0.5 text-micro text-ink-2 hover:bg-panel-2 hover:text-ink">
                  #{tag}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
      <dl className="col-start-2 flex gap-5 text-small sm:col-start-3 sm:row-span-2 sm:row-start-1 sm:flex-col sm:items-end sm:gap-1">
        <div className="flex gap-1.5"><dt className="sr-only">Replies</dt><dd className="figure text-ink">{t.reply_count}</dd><span className="text-muted">{t.reply_count === 1 ? "reply" : "replies"}</span></div>
        <div className="flex gap-1.5"><dt className="sr-only">Upvotes</dt><dd className="figure text-ink">{t.score}</dd><span className="text-muted">up</span></div>
      </dl>
    </li>
  );
}
