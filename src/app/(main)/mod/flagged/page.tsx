import { createClient } from "@/lib/supabase/server";
import { GAMES } from "@/lib/games/catalog";
import { FlaggedActions } from "@/components/mod/flagged-actions";
import { Empty } from "@/components/ui/empty";
import { timeAgo } from "@/lib/utils";
import Link from "next/link";

export default async function FlaggedPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("game_results")
    .select("id, game, score, flag_reason, details, created_at, user:profiles!game_results_user_id_fkey(username, display_name)")
    .eq("is_flagged", true)
    .order("created_at", { ascending: false })
    .limit(100);
  if (!data?.length) return <Empty title="No flagged results.">Results the anti-cheat checks find implausible appear here for review.</Empty>;
  return (
    <ul className="flex flex-col gap-3">
      {data.map((r) => (
        <li key={r.id} className="flex flex-wrap items-center justify-between gap-4 bg-raised px-5 py-4">
          <span>
            <span className="text-ink">{GAMES[r.game].name}: <span className="figure">{Number(r.score)} {GAMES[r.game].unit}</span></span>
            <span className="block text-small text-muted">
              {r.user ? <Link href={`/mod/members/${r.user.username}`} className="underline">@{r.user.username}</Link> : "unknown"} · {timeAgo(r.created_at)} · {r.flag_reason}
            </span>
          </span>
          <FlaggedActions id={r.id} />
        </li>
      ))}
    </ul>
  );
}
