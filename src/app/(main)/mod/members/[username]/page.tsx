import Link from "next/link";
import { notFound } from "next/navigation";
import { requireModerator } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { MemberTools } from "@/components/mod/member-tools";
import { Avatar } from "@/components/ui/avatar";
import { TierMark } from "@/components/ui/tier-mark";

export default async function ModMemberPage({ params }: PageProps<"/mod/members/[username]">) {
  const viewer = await requireModerator();
  const { username } = await params;
  const supabase = await createClient();
  const { data: p } = await supabase.from("profiles").select("id").eq("username", username).maybeSingle();
  if (!p) notFound();
  const { data: overview } = await supabase.rpc("mod_member_overview", { p_user: p.id });
  const o = overview as {
    profile: { id: string; username: string; display_name: string; avatar_url: string | null; tier: number; role: string; bio: string | null; created_at: string };
    sanctions: Array<{ id: number; kind: string; reason: string; created_at: string; expires_at: string | null; revoked_at: string | null }>;
    reports_against: number;
    threads: number;
    replies: number;
    flagged_results: number;
  };
  return (
    <div className="grid gap-12 lg:grid-cols-[minmax(0,20rem)_1fr]">
      <aside className="flex flex-col gap-4">
        <Avatar src={o.profile.avatar_url} name={o.profile.display_name} size={96} />
        <div>
          <p className="font-display text-2xl text-ink">{o.profile.display_name}</p>
          <p className="text-muted">@{o.profile.username} · <TierMark tier={o.profile.tier} withName /></p>
        </div>
        <dl className="grid grid-cols-2 gap-3 text-small">
          <div><dt className="text-muted">Threads</dt><dd className="figure text-ink">{o.threads}</dd></div>
          <div><dt className="text-muted">Replies</dt><dd className="figure text-ink">{o.replies}</dd></div>
          <div><dt className="text-muted">Reports against</dt><dd className="figure text-ink">{o.reports_against}</dd></div>
          <div><dt className="text-muted">Flagged results</dt><dd className="figure text-ink">{o.flagged_results}</dd></div>
        </dl>
        <Link href={`/u/${o.profile.username}`} className="text-ink underline">Public profile</Link>
      </aside>
      <MemberTools userId={o.profile.id} sanctions={o.sanctions} role={o.profile.role} isAdmin={viewer.isAdmin} />
    </div>
  );
}
