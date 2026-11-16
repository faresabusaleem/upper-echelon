import { createClient } from "@/lib/supabase/server";
import { ReportCard, type ReportRow } from "@/components/mod/report-card";
import { Empty } from "@/components/ui/empty";
import Link from "next/link";

export default async function ReportsPage({ searchParams }: PageProps<"/mod">) {
  const sp = await searchParams;
  const status = sp.status === "closed" ? "closed" : "open";
  const supabase = await createClient();
  let q = supabase
    .from("reports")
    .select("*, reporter:profiles!reports_reporter_id_fkey(username, display_name), target_user:profiles!reports_target_user_id_fkey(id, username, display_name)")
    .order("created_at", { ascending: status === "open" })
    .limit(100);
  q = status === "open" ? q.eq("status", "open") : q.neq("status", "open");
  const { data } = await q;
  // Group repeated reports of the same thing.
  const groups = new Map<string, ReportRow>();
  for (const r of (data ?? []) as unknown as ReportRow[]) {
    const key = `${r.target_type}:${r.target_id}`;
    const g = groups.get(key);
    if (g) g.count += 1;
    else groups.set(key, { ...r, count: 1 });
  }
  const rows = [...groups.values()];
  return (
    <div>
      <div className="flex gap-4 text-small">
        <Link href="/mod" className={status === "open" ? "text-ink underline" : "text-muted hover:text-ink"}>Open</Link>
        <Link href="/mod?status=closed" className={status === "closed" ? "text-ink underline" : "text-muted hover:text-ink"}>Closed</Link>
      </div>
      {rows.length ? (
        <div className="mt-6 flex flex-col gap-4">
          {rows.map((r) => (
            <ReportCard key={r.id} r={r} />
          ))}
        </div>
      ) : (
        <Empty className="mt-6" title={status === "open" ? "No open reports." : "No closed reports yet."}>
          {status === "open" ? "The room is in order." : ""}
        </Empty>
      )}
    </div>
  );
}
