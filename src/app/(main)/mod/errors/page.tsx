import { redirect } from "next/navigation";
import { requireModerator } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Empty } from "@/components/ui/empty";
import { timeAgo } from "@/lib/utils";

export default async function ErrorsPage() {
  const viewer = await requireModerator();
  if (!viewer.isAdmin) redirect("/mod");
  const supabase = await createClient();
  const { data } = await supabase.from("error_logs").select("*").order("created_at", { ascending: false }).limit(100);
  if (!data?.length) return <Empty title="No errors recorded.">Client and server errors are kept for 30 days.</Empty>;
  return (
    <ul className="flex flex-col gap-3">
      {data.map((e) => (
        <li key={e.id} className="bg-raised px-5 py-4">
          <p className="text-ink">{e.message}</p>
          <p className="text-small text-muted">{timeAgo(e.created_at)} · {e.url ?? "?"} {e.digest ? `· ${e.digest}` : ""}</p>
          {e.stack && <pre className="mt-2 max-h-40 overflow-auto font-mono text-micro text-muted">{e.stack}</pre>}
        </li>
      ))}
    </ul>
  );
}
