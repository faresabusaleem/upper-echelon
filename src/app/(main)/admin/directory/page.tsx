import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { TestForm } from "@/components/mod/test-form";
import { Notice } from "@/components/ui/notice";
import { DIFFICULTY } from "@/lib/directory";

export default async function AdminDirectoryPage({ searchParams }: PageProps<"/admin/directory">) {
  const sp = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.from("directory_tests").select("id, name, author, difficulty, is_published, link_status, position").order("position");
  return (
    <div className="grid gap-14 xl:grid-cols-[1fr_1.2fr]">
      <section aria-labelledby="list-h">
        <h2 id="list-h" className="font-display text-display-s text-ink">Entries</h2>
        {sp.saved && <Notice tone="success" className="mt-4">Saved.</Notice>}
        {sp.deleted && <Notice tone="success" className="mt-4">Deleted.</Notice>}
        <ul className="mt-4 flex flex-col">
          {(data ?? []).map((t) => (
            <li key={t.id}>
              <Link href={`/admin/directory/${t.id}`} className="flex justify-between gap-4 px-2 py-3 hover:bg-raised">
                <span>
                  <span className="text-ink">{t.name}</span>
                  <span className="block text-small text-muted">{t.author} · {DIFFICULTY[t.difficulty]}{t.is_published ? "" : " · unpublished"}{t.link_status !== "ok" ? " · link unreachable" : ""}</span>
                </span>
                <span className="figure text-small text-muted">{t.position}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
      <section aria-labelledby="new-h">
        <h2 id="new-h" className="font-display text-display-s text-ink">Add a test</h2>
        <p className="mt-2 text-small text-muted">Link to the official source only. Never add questions. A discussion thread opens automatically.</p>
        <div className="mt-6"><TestForm /></div>
      </section>
    </div>
  );
}
