import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Avatar } from "@/components/ui/avatar";
import { TierMark } from "@/components/ui/tier-mark";
import { formatDate } from "@/lib/utils";

export default async function MembersPage({ searchParams }: PageProps<"/mod/members">) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 40) : "";
  const supabase = await createClient();
  let query = supabase.from("profiles").select("id, username, display_name, avatar_url, tier, role, created_at").order("created_at", { ascending: false }).limit(50);
  if (q) query = query.or(`username.ilike.%${q.replace(/[%,()]/g, "")}%,display_name.ilike.%${q.replace(/[%,()]/g, "")}%`);
  const [{ data }, { data: active }] = await Promise.all([
    query,
    supabase.from("sanctions").select("user_id, kind, expires_at").is("revoked_at", null).neq("kind", "warning"),
  ]);
  const sanctioned = new Map((active ?? []).filter((s) => !s.expires_at || new Date(s.expires_at) > new Date()).map((s) => [s.user_id, s.kind]));
  return (
    <div>
      <form className="flex max-w-lg gap-2">
        <label htmlFor="mq" className="sr-only">Search members</label>
        <input id="mq" name="q" defaultValue={q} placeholder="Username or name" className="h-11 flex-1 border border-panel-3 bg-panel px-4 text-ink focus:border-gold-deep focus:outline-none" />
        <button className="h-11 bg-panel-2 px-4 text-ink hover:bg-panel-3">Search</button>
      </form>
      <ul className="mt-6 flex flex-col">
        {(data ?? []).map((m) => (
          <li key={m.id}>
            <Link href={`/mod/members/${m.username}`} className="grid grid-cols-[auto_1fr_auto] items-center gap-4 px-2 py-3 hover:bg-raised">
              <Avatar src={m.avatar_url} name={m.display_name} size={36} />
              <span>
                <span className="text-ink">{m.display_name}</span> <span className="text-small text-muted">@{m.username}</span>
                <span className="block text-small text-muted">Joined {formatDate(m.created_at)}{m.role !== "member" ? ` · ${m.role}` : ""}</span>
              </span>
              <span className="flex items-center gap-3">
                {sanctioned.get(m.id) && <span className="bg-danger-wash px-2 py-0.5 text-micro text-danger capitalize">{sanctioned.get(m.id)}</span>}
                <TierMark tier={m.tier} />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
