import Link from "next/link";
import type { Metadata } from "next";
import { getViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ForumBoard } from "@/components/forum/board";
import { Crumbs, HubPage, PageHead } from "@/components/hub/hub-page";
import { ButtonLink } from "@/components/ui/button";
import { PlusIcon } from "@/components/ui/icons";

export const metadata: Metadata = {
  title: "The Forum",
  description: "Psychometrics, puzzles, mathematics, philosophy, science and books, argued with care.",
};

export default async function ForumPage() {
  const viewer = await getViewer();
  const supabase = await createClient();
  const { data: tags } = await supabase.rpc("popular_tags", { lim: 24 });
  const canWrite = !!viewer?.profile.onboarded_at && !viewer.ban;

  return (
    <HubPage>
      <Crumbs items={[{ href: "/", label: "Upper Echelon" }, { label: "Forum" }]} />
      <PageHead
        title="The Forum"
        lede="Arguments judged by their quality, not their volume. Read freely; members may write."
        actions={
          <>
            {viewer && (
              <ButtonLink href="/forum/bookmarks" variant="secondary" size="sm">
                Bookmarks
              </ButtonLink>
            )}
            {canWrite ? (
              <ButtonLink href="/forum/new" size="sm">
                <PlusIcon size={16} /> Post thread
              </ButtonLink>
            ) : (
              <ButtonLink href="/join" size="sm">
                Join to write
              </ButtonLink>
            )}
          </>
        }
      />
      <ForumBoard />
      {tags && tags.length > 0 && (
        <section className="panel" aria-labelledby="tags-h">
          <h2 id="tags-h" className="panel-head">Tags</h2>
          <ul className="flex flex-wrap gap-2 p-4">
            {tags.map((t) => (
              <li key={t.tag}>
                <Link href={`/forum/tags/${t.tag}`} className="chip hover:bg-panel-3 hover:text-ink">
                  #{t.tag} <span className="figure text-faint">{Number(t.threads)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </HubPage>
  );
}
