import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { ThreadRow, type ThreadListItem } from "@/components/forum/thread-row";
import { Empty } from "@/components/ui/empty";

type Props = PageProps<"/forum/tags/[tag]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: `#${decodeURIComponent((await params).tag)} · Forum` };
}

export default async function TagPage({ params }: Props) {
  const tag = decodeURIComponent((await params).tag).toLowerCase().slice(0, 24);
  const supabase = await createClient();
  const { data } = await supabase.from("thread_list").select("*").contains("tags", [tag]).is("removed_at", null).order("last_activity_at", { ascending: false }).limit(50);
  return (
    <div className="mx-auto w-full max-w-[96rem] px-[var(--gutter)] pb-10 pt-10 sm:pt-14">
      <nav aria-label="Breadcrumb" className="text-small text-muted"><Link href="/forum" className="hover:text-ink">The Forum</Link></nav>
      <h1 className="mt-3 font-display text-display-l text-ink">#{tag}</h1>
      {data && data.length ? (
        <ul className="mt-8 flex flex-col">{(data as ThreadListItem[]).map((t) => <ThreadRow key={t.id} t={t} />)}</ul>
      ) : (
        <Empty className="mt-8" title="No threads with this tag." />
      )}
    </div>
  );
}
