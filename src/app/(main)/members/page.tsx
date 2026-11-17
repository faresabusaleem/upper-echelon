import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { Crumbs, HubPage, PageHead } from "@/components/hub/hub-page";
import { tierColor } from "@/components/hub/sidebar";
import { Avatar } from "@/components/ui/avatar";
import { RankBadge } from "@/components/ui/sigils";
import { cn, timeAgo } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Members",
  description: "Who is here, who has risen highest, and who has the most to say.",
};

const VIEWS = [
  ["present", "Present now"],
  ["echelon", "Highest Echelon"],
  ["voice", "Most messages"],
  ["new", "Newest"],
] as const;
type View = (typeof VIEWS)[number][0];

type Row = {
  username: string;
  display_name: string;
  avatar_url: string | null;
  tier: number;
  echelon_score?: number;
  message_count?: number;
  reputation?: number;
  onboarded_at?: string | null;
  is_staff?: boolean;
  role?: string;
  last_seen_at?: string;
};

export default async function MembersPage({ searchParams }: PageProps<"/members">) {
  const sp = await searchParams;
  const view: View = VIEWS.some(([v]) => v === sp.view) ? (sp.view as View) : "present";
  const supabase = await createClient();
  const fields = "username, display_name, avatar_url, tier, echelon_score, message_count, reputation, onboarded_at, is_staff, role";

  let rows: Row[] = [];
  let note = "";
  if (view === "present") {
    const { data } = await supabase.rpc("online_now", { lim: 100 });
    const o = (data ?? { list: [], members: 0, guests: 0 }) as unknown as { list: Row[]; members: number; guests: number };
    rows = o.list;
    note = `${o.members} ${o.members === 1 ? "member" : "members"} and ${o.guests} ${o.guests === 1 ? "visitor" : "visitors"} in the last 15 minutes. Members who prefer not to show are counted but not listed.`;
  } else {
    const base = supabase.from("profiles").select(fields).not("onboarded_at", "is", null).eq("is_staff", false).limit(60);
    const { data } =
      view === "echelon"
        ? await base.order("echelon_score", { ascending: false }).order("onboarded_at")
        : view === "voice"
          ? await base.order("message_count", { ascending: false }).order("onboarded_at")
          : await base.order("onboarded_at", { ascending: false });
    rows = (data ?? []) as unknown as Row[];
  }

  return (
    <HubPage>
      <Crumbs items={[{ href: "/", label: "Upper Echelon" }, { label: "Members" }]} />
      <PageHead title="Members" lede="The society, as it stands. Ranks are earned in the Arena, kept by practice, and raised by good writing." />
      <section className="panel">
        <nav aria-label="Member lists" className="flex flex-wrap gap-1 border-b border-line px-3 py-2.5">
          {VIEWS.map(([v, label]) => (
            <Link
              key={v}
              href={v === "present" ? "/members" : `/members?view=${v}`}
              aria-current={v === view ? "page" : undefined}
              className={cn(
                "rounded-full px-3 py-1.5 text-small transition-colors",
                v === view ? "bg-gold text-ground" : "text-ink-2 hover:bg-panel-2 hover:text-ink",
              )}
            >
              {label}
            </Link>
          ))}
        </nav>
        {note && <p className="border-b border-line px-4 py-2.5 text-micro text-muted">{note}</p>}
        {rows.length > 0 ? (
          <ol className="rows">
            {rows.map((m, i) => (
              <li key={m.username} className="flex items-center gap-3 px-4 py-3 hover:bg-panel/60">
                {view !== "present" && view !== "new" && (
                  <span className={cn("figure w-6 text-right text-small", i < 3 ? "text-gold" : "text-faint")}>{i + 1}</span>
                )}
                <Avatar src={m.avatar_url} name={m.display_name} size={40} />
                <div className="min-w-0 flex-1">
                  <Link href={`/u/${m.username}`} className="font-medium hover:underline" style={{ color: tierColor(m.tier) }}>
                    {m.display_name}
                  </Link>
                  <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-micro text-muted">
                    <RankBadge tier={m.tier} />
                    <span>@{m.username}</span>
                    {m.last_seen_at && <span>· here {timeAgo(m.last_seen_at)}</span>}
                    {m.onboarded_at && view === "new" && <span>· joined {timeAgo(m.onboarded_at)}</span>}
                  </div>
                </div>
                {view !== "present" && (
                  <dl className="hidden grid-cols-3 gap-6 text-right text-micro sm:grid">
                    <div>
                      <dt className="text-muted">Echelon</dt>
                      <dd className="figure text-ink">{m.echelon_score ?? 0}</dd>
                    </div>
                    <div>
                      <dt className="text-muted">Messages</dt>
                      <dd className="figure text-ink">{m.message_count ?? 0}</dd>
                    </div>
                    <div>
                      <dt className="text-muted">Reputation</dt>
                      <dd className="figure text-ink">{m.reputation ?? 0}</dd>
                    </div>
                  </dl>
                )}
              </li>
            ))}
          </ol>
        ) : (
          <p className="px-4 py-10 text-center text-muted">
            {view === "present" ? "No members are showing right now." : "No members yet. The first seats are still empty."}
          </p>
        )}
      </section>
    </HubPage>
  );
}
