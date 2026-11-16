import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ThreadRow, type ThreadListItem } from "@/components/forum/thread-row";
import { Pager } from "@/components/forum/pager";
import { ButtonLink } from "@/components/ui/button";
import { Empty } from "@/components/ui/empty";
import { tierInfo } from "@/lib/tiers";
import { cn } from "@/lib/utils";

type Props = PageProps<"/forum/c/[slug]">;
const PER_PAGE = 25;
const SORTS = [
  ["active", "Active"],
  ["new", "New"],
  ["top", "Top"],
] as const;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const supabase = await createClient();
  const { data } = await supabase.from("forum_categories").select("name, description").eq("slug", (await params).slug).maybeSingle();
  return data ? { title: `${data.name} · Forum`, description: data.description } : { title: "Forum" };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const sort = SORTS.some(([s]) => s === sp.sort) ? (sp.sort as string) : "active";
  const page = Math.max(1, Number(sp.page) || 1);
  const supabase = await createClient();
  const viewer = await getViewer();

  const { data: cat } = await supabase.from("forum_categories").select("*").eq("slug", slug).maybeSingle();
  if (!cat) {
    // The category exists but is above the viewer's tier: explain rather than 404.
    if (slug === "inner-room") {
      return (
        <div className="mx-auto w-full max-w-3xl px-[var(--gutter)] py-24">
          <h1 className="font-display text-display-l text-ink">The Inner Room</h1>
          <p className="mt-6 text-lede text-ink-2">
            This room opens at the third tier, {tierInfo(3).name}. Play, practise and contribute; the door will notice.
          </p>
          <ButtonLink href={viewer ? "/home" : "/join"} className="mt-10">{viewer ? "See your standing" : "Begin your initiation"}</ButtonLink>
        </div>
      );
    }
    notFound();
  }

  const order = sort === "new" ? "created_at" : sort === "top" ? "score" : "last_activity_at";
  const from = (page - 1) * PER_PAGE;
  const { data: threads } = await supabase
    .from("thread_list")
    .select("*")
    .eq("category_id", cat.id)
    .is("removed_at", null)
    .order("is_pinned", { ascending: false })
    .order(order, { ascending: false })
    .order("id", { ascending: false })
    .range(from, from + PER_PAGE);
  const rows = (threads ?? []) as ThreadListItem[];
  const canPost = !!viewer?.profile.onboarded_at && (!cat.staff_only || viewer.isModerator || viewer.profile.is_staff);
  const href = (p: number, s = sort) => `/forum/c/${slug}?${new URLSearchParams({ ...(s !== "active" ? { sort: s } : {}), ...(p > 1 ? { page: String(p) } : {}) })}`;

  return (
    <div className="mx-auto w-full max-w-[96rem] px-[var(--gutter)] pb-10 pt-10 sm:pt-14">
      <nav aria-label="Breadcrumb" className="text-small text-muted">
        <Link href="/forum" className="hover:text-ink">The Forum</Link>
      </nav>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-6">
        <div>
          <h1 className="font-display text-display-l text-ink">{cat.name}</h1>
          <p className="mt-3 max-w-[60ch] text-ink-2">{cat.description}</p>
        </div>
        {canPost ? (
          <ButtonLink href={`/forum/new?category=${cat.id}`}>Start a thread</ButtonLink>
        ) : !viewer ? (
          <ButtonLink href="/join" variant="secondary">Join to write</ButtonLink>
        ) : null}
      </div>
      <nav aria-label="Sort" className="mt-10 flex gap-2">
        {SORTS.map(([s, label]) => (
          <Link
            key={s}
            href={href(1, s)}
            aria-current={s === sort ? "page" : undefined}
            className={cn("px-3 py-2 text-small", s === sort ? "bg-gold text-ground" : "bg-panel text-ink-2 hover:bg-panel-2 hover:text-ink")}
          >
            {label}
          </Link>
        ))}
      </nav>
      {rows.length > 0 ? (
        <ul className="mt-4 flex flex-col">
          {rows.slice(0, PER_PAGE).map((t) => (
            <ThreadRow key={t.id} t={t} showCategory={false} />
          ))}
        </ul>
      ) : (
        <Empty className="mt-6" title="No threads yet.">{canPost ? "Begin the first one." : "Nothing has been written here yet."}</Empty>
      )}
      <Pager page={page} hasMore={rows.length > PER_PAGE} href={(p) => href(p)} />
    </div>
  );
}
