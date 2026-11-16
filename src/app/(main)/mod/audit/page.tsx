import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";

export default async function AuditPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("audit_log")
    .select("*, actor:profiles!audit_log_actor_id_fkey(username), target:profiles!audit_log_target_user_id_fkey(username)")
    .order("created_at", { ascending: false })
    .limit(200);
  return (
    <table className="w-full text-left text-small">
      <caption className="sr-only">Moderation audit log</caption>
      <thead className="text-muted">
        <tr>
          <th className="pb-3 font-normal">When</th>
          <th className="pb-3 font-normal">Who</th>
          <th className="pb-3 font-normal">Action</th>
          <th className="pb-3 font-normal">Target</th>
          <th className="hidden pb-3 font-normal md:table-cell">Details</th>
        </tr>
      </thead>
      <tbody>
        {(data ?? []).map((a) => (
          <tr key={a.id} className="align-top even:bg-raised">
            <td className="py-2 pl-2 text-muted">{formatDate(a.created_at)}<br />{new Date(a.created_at).toISOString().slice(11, 16)} UTC</td>
            <td className="py-2 text-ink">{a.actor ? `@${a.actor.username}` : "system"}</td>
            <td className="py-2 text-ink">{a.action.replace(/_/g, " ")}</td>
            <td className="py-2 text-ink-2">{a.target_type} {a.target_id}{a.target ? ` (@${a.target.username})` : ""}</td>
            <td className="hidden py-2 pr-2 font-mono text-micro text-muted md:table-cell">{JSON.stringify(a.details)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
