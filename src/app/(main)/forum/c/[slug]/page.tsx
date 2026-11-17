import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ThreadListHead, ThreadRow, type ThreadListItem } from "@/components/forum/thread-row";
import { Pager } from "@/components/forum/pager";
import { Crumbs, HubPage, PageHead } from "@/components/hub/hub-page";
import { ButtonLink } from "@/components/ui/button";
import { PlusIcon } from "@/components/ui/icons";
import { Sigil } from "@/components/ui/sigils";
import { tierInfo } from "@/lib/tiers";
import { cn } from "@/lib/utils";

type Props = PageProps<"/forum/c/[slug]">;
const PER_PAGE = 25;
const SORTS = [
  ["active", "Latest activity"],
  ["new", "Newest"],
  ["top", "Most upvoted"],
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

  const { data: cat } = await supabase
    .from("forum_categories")
    .select("*, section:forum_sections(slug, name)")
    .eq("slug", slug)
    .maybeSingle();
  if (!cat) {
    // The room exists but is above the viewer's tier: explain rather than 404.
    if (slug === "inner-room") {
      return (
        <HubPage>
          <Crumbs items={[{ href: "/", label: "Upper Echelon" }, { href: "/forum", label: "Forum" }, { label: "The Inner Sanctum" }]} />
          <section className="panel relative overflow-hidden px-6 py-12 text-center sm:px-12">
            <div aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center text-gold/[0.07]">
              <Sigil name="eye" size={420} strokeWidth={0.6} />
            </div>
            <Sigil name="eye" size={48} className="mx-auto text-gold" />
            <h1 className="mt-5 font-display text-[clamp(2rem,4vw,3rem)] leading-tight text-ink">The Inner Sanctum is sealed.</h1>
            <p className="mx-auto mt-3 max-w-[48ch] text-ink-2">
              It opens at the third tier, {tierInfo(3).name}. Play the trials, keep your daily rite and write well; the door
              notices.
            </p>
            <ButtonLink href={viewer ? "/home" : "/join"} className="mt-7">
              {viewer ? "See how close you are" : "Begin your initiation"}
            </ButtonLink>
          </section>
        </HubPage>
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
  const canPost = !!viewer?.profile.onboarded_at && !viewer.ban && (!cat.staff_only || viewer.isModerator || viewer.profile.is_staff);
  const href = (p: number, s = sort) =>
    `/forum/c/${slug}?${new URLSearchParams({ ...(s !== "active" ? { sort: s } : {}), ...(p > 1 ? { page: String(p) } : {}) })}`;
  const section = cat.section as { slug: string; name: string } | null;

  return (
    <HubPage>
      <Crumbs
        items={[
          { href: "/", label: "Upper Echelon" },
          { href: "/forum", label: "Forum" },
          ...(section ? [{ href: `/forum#sec-${section.slug}`, label: section.name }] : []),
          { label: cat.name },
        ]}
      />
      <PageHead
        title={
          <span className="inline-flex items-center gap-3">
            <span className="inline-flex size-11 items-center justify-center rounded-xl bg-gold-wash text-gold">
              <Sigil name={cat.icon} size={24} />
            </span>
            {cat.name}
          </span>
        }
        lede={cat.description}
        actions={
          canPost ? (
            <ButtonLink href={`/forum/new?category=${cat.id}`} size="sm">
              <PlusIcon size={16} /> Post thread
            </ButtonLink>
          ) : !viewer ? (
            <ButtonLink href="/join" variant="secondary" size="sm">
              Join to write
            </ButtonLink>
          ) : cat.staff_only ? (
            <span className="text-small text-muted">Only staff start threads here.</span>
          ) : null
        }
      />

      <section className="panel">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-3 py-2.5">
          <nav aria-label="Sort" className="flex flex-wrap gap-1">
            {SORTS.map(([s, label]) => (
              <Link
                key={s}
                href={href(1, s)}
                aria-current={s === sort ? "page" : undefined}
                className={cn(
                  "rounded-full px-3 py-1.5 text-small transition-colors",
                  s === sort ? "bg-gold text-ground" : "text-ink-2 hover:bg-panel-2 hover:text-ink",
                )}
              >
                {label}
              </Link>
            ))}
          </nav>
          <span className="pr-1 text-micro text-faint">Page {page}</span>
        </div>
        <ThreadListHead />
        {rows.length > 0 ? (
          <ul className="rows">
            {rows.slice(0, PER_PAGE).map((t) => (
              <ThreadRow key={t.id} t={t} showCategory={false} />
            ))}
          </ul>
        ) : (
          <div className="px-6 py-14 text-center">
            <Sigil name={cat.icon} size={36} className="mx-auto text-faint" />
            <p className="mt-3 font-display text-2xl text-ink">No threads yet.</p>
            <p className="mt-1 text-small text-muted">{canPost ? "Begin the first one." : "Nothing has been written here yet."}</p>
          </div>
        )}
      </section>
      <Pager page={page} hasMore={rows.length > PER_PAGE} href={(p) => href(p)} />
    </HubPage>
  );
}
