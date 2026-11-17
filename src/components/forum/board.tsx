import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Avatar } from "@/components/ui/avatar";
import { LockIcon } from "@/components/ui/icons";
import { Sigil } from "@/components/ui/sigils";
import { tierColor } from "@/components/hub/sidebar";
import { tierInfo } from "@/lib/tiers";
import { cn, slugify, timeAgo } from "@/lib/utils";

type Room = {
  category_id: number;
  slug: string;
  name: string;
  description: string;
  icon: string;
  min_tier: number;
  staff_only: boolean;
  section_slug: string | null;
  section_name: string | null;
  section_description: string | null;
  can_view: boolean;
  threads: number | null;
  messages: number | null;
  last_thread_id: number | null;
  last_thread_title: string | null;
  last_activity_at: string | null;
  last_username: string | null;
  last_display_name: string | null;
  last_avatar_url: string | null;
  last_tier: number | null;
};

/** The board index: sections, and in each one its rooms with counts and the latest post. */
export async function ForumBoard() {
  const supabase = await createClient();
  const { data } = await supabase.rpc("forum_index");
  const rooms = (data ?? []) as Room[];
  const sections: Array<{ slug: string; name: string; description: string; rooms: Room[] }> = [];
  for (const r of rooms) {
    const key = r.section_slug ?? "other";
    let s = sections.find((x) => x.slug === key);
    if (!s) {
      s = { slug: key, name: r.section_name ?? "Other rooms", description: r.section_description ?? "", rooms: [] };
      sections.push(s);
    }
    s.rooms.push(r);
  }
  // Server Components render once per request, so reading the clock here is deterministic per response.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();

  return (
    <div className="flex flex-col gap-5">
      {sections.map((s) => (
        <section key={s.slug} className="panel" aria-labelledby={`sec-${s.slug}`}>
          <h2 id={`sec-${s.slug}`} className="panel-head">
            {s.name}
            {s.description && <small className="hidden truncate sm:block">{s.description}</small>}
          </h2>
          <ul className="rows">
            {s.rooms.map((r) => (
              <RoomRow key={r.category_id} r={r} fresh={!!r.last_activity_at && now - new Date(r.last_activity_at).getTime() < 86_400_000} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function RoomRow({ r, fresh }: { r: Room; fresh: boolean }) {
  const locked = !r.can_view;
  return (
    <li
      className={cn(
        "grid grid-cols-[2.75rem_minmax(0,1fr)] items-center gap-x-3.5 gap-y-2 px-4 py-3.5 transition-colors hover:bg-panel/60",
        "md:grid-cols-[2.75rem_minmax(0,1fr)_8.5rem_15rem]",
        locked && "opacity-80",
      )}
    >
      <span
        className={cn(
          "row-span-2 inline-flex size-11 items-center justify-center rounded-xl md:row-span-1",
          locked ? "bg-panel text-faint" : fresh ? "bg-gold-wash text-gold shadow-[inset_0_0_0_1px_rgba(194,161,95,0.35)]" : "bg-panel-2 text-ink-2",
        )}
        title={locked ? "Locked" : fresh ? "Active in the last day" : undefined}
      >
        {locked ? <LockIcon size={18} /> : <Sigil name={r.icon} size={22} />}
      </span>

      <div className="min-w-0">
        <Link href={`/forum/c/${r.slug}`} className="text-[1.02rem] font-medium leading-snug text-ink hover:text-gold-bright">
          {r.name}
        </Link>
        <p className="mt-0.5 line-clamp-2 text-small text-muted">{r.description}</p>
        {locked && (
          <p className="mt-1 text-micro text-gold">
            Opens at tier {tierInfo(r.min_tier).numeral}, {tierInfo(r.min_tier).name}.
          </p>
        )}
      </div>

      <dl className="col-start-2 flex gap-4 text-micro md:col-start-3 md:flex-col md:gap-0.5 md:text-right">
        {locked ? (
          <dd className="text-faint md:col-span-2">Sealed</dd>
        ) : (
          <>
            <div className="flex gap-1.5 md:justify-end">
              <dt className="text-muted">Threads</dt>
              <dd className="figure text-ink">{Number(r.threads ?? 0).toLocaleString("en-GB")}</dd>
            </div>
            <div className="flex gap-1.5 md:justify-end">
              <dt className="text-muted">Messages</dt>
              <dd className="figure text-ink">{Number(r.messages ?? 0).toLocaleString("en-GB")}</dd>
            </div>
          </>
        )}
      </dl>

      <div className="col-start-2 min-w-0 md:col-start-4">
        {!locked && r.last_thread_id && r.last_thread_title ? (
          <div className="flex items-center gap-2.5">
            <span className="hidden shrink-0 md:block"><Avatar src={r.last_avatar_url} name={r.last_display_name ?? "?"} size={30} /></span>
            <div className="min-w-0">
              <Link
                href={`/forum/t/${r.last_thread_id}/${slugify(r.last_thread_title)}`}
                className="block truncate text-small text-ink-2 hover:text-ink"
              >
                {r.last_thread_title}
              </Link>
              <p className="truncate text-micro text-muted">
                <time dateTime={r.last_activity_at ?? undefined}>{r.last_activity_at ? timeAgo(r.last_activity_at) : ""}</time>
                {r.last_username && (
                  <>
                    {" · "}
                    <Link href={`/u/${r.last_username}`} style={{ color: tierColor(r.last_tier ?? 1) }} className="hover:underline">
                      {r.last_display_name}
                    </Link>
                  </>
                )}
              </p>
            </div>
          </div>
        ) : (
          !locked && <p className="text-micro text-faint">No threads yet</p>
        )}
      </div>
    </li>
  );
}
