import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { after } from "next/server";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { excerpt, renderMarkdown } from "@/lib/markdown";
import { Crumbs, HubPage } from "@/components/hub/hub-page";
import { tierColor } from "@/components/hub/sidebar";
import { Avatar } from "@/components/ui/avatar";
import { ButtonLink } from "@/components/ui/button";
import { CheckIcon, EyeIcon, LockIcon, PinIcon } from "@/components/ui/icons";
import { Notice } from "@/components/ui/notice";
import { RankBadge } from "@/components/ui/sigils";
import { LiveReplies, PollView, PostControls, ReplyForm, ThreadControls, VoteButton } from "@/components/forum/thread-client";
import { formatDate, slugify, timeAgo } from "@/lib/utils";

type Props = PageProps<"/forum/t/[id]/[[...slug]]">;

const AUTHOR = "id, username, display_name, avatar_url, tier, is_staff, role, message_count, reputation, created_at";

type Author = {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  tier: number;
  is_staff: boolean;
  role: string;
  message_count: number;
  reputation: number;
  created_at: string;
} | null;

async function loadThread(id: number) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("threads")
    .select(`*, category:forum_categories(id, slug, name, is_advice, section:forum_sections(slug, name)), author:profiles!threads_author_id_fkey(${AUTHOR})`)
    .eq("id", id)
    .maybeSingle();
  return data;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const id = Number((await params).id);
  if (!Number.isFinite(id)) return {};
  const t = await loadThread(id);
  if (!t || t.removed_at) return { title: "Thread" };
  return {
    title: t.title,
    description: excerpt(t.body, 160),
    alternates: { canonical: `/forum/t/${t.id}/${slugify(t.title)}` },
    openGraph: { type: "article", title: t.title, description: excerpt(t.body, 200), images: [{ url: `/api/og/thread/${t.id}`, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", images: [`/api/og/thread/${t.id}`] },
  };
}

const joined = new Intl.DateTimeFormat("en-GB", { month: "short", year: "numeric", timeZone: "UTC" });

/** The left-hand column of a post: who is speaking, and their standing in the society. */
function MemberPanel({ a, isOp }: { a: Author; isOp?: boolean }) {
  if (!a) {
    return (
      <aside className="flex items-center gap-3 border-b border-line bg-panel/40 p-4 md:flex-col md:border-b-0 md:border-r md:text-center">
        <span className="md:hidden"><Avatar name="?" size={40} /></span>
        <span className="hidden md:block"><Avatar name="?" size={84} /></span>
        <p className="text-small text-muted">A former member</p>
      </aside>
    );
  }
  const role = a.role === "admin" ? "Administrator" : a.role === "moderator" ? "Moderator" : null;
  return (
    <aside className="flex items-center gap-3 border-b border-line bg-panel/40 p-4 md:flex-col md:items-center md:gap-2 md:border-b-0 md:border-r md:py-5 md:text-center">
      <Link href={`/u/${a.username}`} className="shrink-0">
        <span className="md:hidden"><Avatar src={a.avatar_url} name={a.display_name} size={40} /></span>
        <span className="hidden md:block"><Avatar src={a.avatar_url} name={a.display_name} size={84} /></span>
      </Link>
      <div className="flex min-w-0 flex-col gap-1 md:items-center">
        <Link href={`/u/${a.username}`} className="truncate font-medium hover:underline" style={{ color: tierColor(a.tier) }}>
          {a.display_name}
        </Link>
        <div className="flex flex-wrap items-center gap-1 md:justify-center">
          <RankBadge tier={a.tier} />
          {a.is_staff && <span className="chip bg-gold-wash text-gold-bright">Staff</span>}
          {role && !a.is_staff && <span className="chip bg-ember-wash text-ember">{role}</span>}
          {isOp && <span className="chip">Author</span>}
        </div>
      </div>
      <dl className="ml-auto hidden w-full grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 pt-2 text-left text-micro md:grid">
        <dt className="text-muted">Joined</dt>
        <dd className="text-right text-ink-2">{joined.format(new Date(a.created_at))}</dd>
        <dt className="text-muted">Messages</dt>
        <dd className="figure text-right text-ink-2">{a.message_count.toLocaleString("en-GB")}</dd>
        <dt className="text-muted">Reputation</dt>
        <dd className="figure text-right text-ink-2">{a.reputation.toLocaleString("en-GB")}</dd>
      </dl>
    </aside>
  );
}

/** One message on the page: member panel on the left, the words on the right. */
function PostCard({
  id,
  number,
  author,
  isOp,
  createdAt,
  editedAt,
  solved,
  children,
  footer,
}: {
  id: string;
  number: number;
  author: Author;
  isOp?: boolean;
  createdAt: string;
  editedAt: string | null;
  solved?: boolean;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <article id={id} className={`panel scroll-mt-24 md:grid md:grid-cols-[11.5rem_minmax(0,1fr)] ${solved ? "ring-1 ring-ok/50" : ""}`}>
      <MemberPanel a={author} isOp={isOp} />
      <div className="flex min-w-0 flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-line px-5 py-2 text-micro text-muted">
          <span className="flex flex-wrap items-center gap-x-2">
            <time dateTime={createdAt} title={formatDate(createdAt)}>
              {timeAgo(createdAt)}
            </time>
            {editedAt && <span>· edited {timeAgo(editedAt)}</span>}
            {solved && (
              <span className="inline-flex items-center gap-1 text-ok">
                <CheckIcon size={13} /> The answer
              </span>
            )}
          </span>
          <a href={`#${id}`} className="figure hover:text-ink">
            #{number}
          </a>
        </header>
        <div className="min-w-0 px-5 py-4">{children}</div>
        <footer className="mt-auto flex flex-wrap items-start gap-2 border-t border-line px-4 py-2">{footer}</footer>
      </div>
    </article>
  );
}

export default async function ThreadPage({ params }: Props) {
  const { id: rawId, slug } = await params;
  const id = Number(rawId);
  if (!Number.isInteger(id)) notFound();
  const t = await loadThread(id);
  if (!t) notFound();
  const expected = slugify(t.title);
  if (slug?.[0] !== expected) permanentRedirect(`/forum/t/${t.id}/${expected}`);

  // Count the view once the page has been sent.
  if (!t.removed_at) {
    after(async () => {
      try {
        await createAdminClient().rpc("count_thread_view", { tid: t.id });
      } catch {
        // A missed view count is harmless.
      }
    });
  }

  const viewer = await getViewer();
  const supabase = await createClient();
  const isMember = !!viewer?.profile.onboarded_at && !viewer.ban;
  const isModerator = !!viewer?.isModerator;
  const isAuthor = !!viewer && viewer.id === t.author_id;

  const [{ data: posts }, { data: poll }, myVotes, extras, { data: cats }] = await Promise.all([
    supabase
      .from("posts")
      .select(`*, author:profiles!posts_author_id_fkey(${AUTHOR})`)
      .eq("thread_id", id)
      .order("created_at")
      .limit(500),
    supabase.from("polls").select("*").eq("thread_id", id).maybeSingle(),
    viewer
      ? Promise.all([
          supabase.from("thread_votes").select("thread_id").eq("user_id", viewer.id).eq("thread_id", id).maybeSingle(),
          supabase.from("post_votes").select("post_id, posts!inner(thread_id)").eq("user_id", viewer.id).eq("posts.thread_id", id),
        ])
      : null,
    viewer
      ? Promise.all([
          supabase.from("bookmarks").select("thread_id").eq("user_id", viewer.id).eq("thread_id", id).maybeSingle(),
          supabase.from("thread_subscriptions").select("thread_id").eq("user_id", viewer.id).eq("thread_id", id).maybeSingle(),
          supabase.from("drafts").select("body").eq("user_id", viewer.id).eq("thread_id", id).maybeSingle(),
        ])
      : null,
    isModerator ? supabase.from("forum_categories").select("id, name").order("position") : Promise.resolve({ data: [] }),
  ]);

  // Server Components render once per request, so reading the clock here is deterministic per response.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  let pollResults: Record<number, number> = {};
  let myPoll: number[] = [];
  if (poll) {
    const [{ data: res }, { data: mine }] = await Promise.all([
      supabase.rpc("poll_results", { p_poll: poll.id }),
      viewer ? supabase.from("poll_votes").select("option_index").eq("poll_id", poll.id).eq("user_id", viewer.id) : Promise.resolve({ data: [] }),
    ]);
    pollResults = Object.fromEntries((res ?? []).map((r) => [r.option_index, Number(r.votes)]));
    myPoll = (mine ?? []).map((m) => m.option_index);
  }

  const votedThread = !!myVotes?.[0].data;
  const votedPosts = new Set((myVotes?.[1].data ?? []).map((v) => v.post_id));
  const [bookmarked, following, draft] = extras ? [!!extras[0].data, !!extras[1].data, extras[2].data?.body ?? ""] : [false, false, ""];

  const bodyHtml = await renderMarkdown(t.body);
  const replies = await Promise.all((posts ?? []).map(async (p) => ({ ...p, html: await renderMarkdown(p.body) })));
  const solution = replies.find((r) => r.id === t.solved_post_id);
  const canMarkSolution = !!t.category?.is_advice && (isAuthor || isModerator);
  const section = (t.category?.section ?? null) as { slug: string; name: string } | null;
  const opAuthor = t.author as Author;

  return (
    <HubPage>
      <Crumbs
        items={[
          { href: "/", label: "Upper Echelon" },
          { href: "/forum", label: "Forum" },
          ...(section ? [{ href: `/forum#sec-${section.slug}`, label: section.name }] : []),
          { href: `/forum/c/${t.category?.slug}`, label: t.category?.name ?? "Room" },
        ]}
      />

      <header className="flex flex-col gap-2">
        <h1 className="font-display text-[clamp(1.8rem,3vw,2.5rem)] leading-[1.08] text-ink">{t.title}</h1>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-small text-muted">
          {t.is_pinned && <span className="inline-flex items-center gap-1 text-gold"><PinIcon size={14} /> Pinned</span>}
          {t.is_locked && <span className="inline-flex items-center gap-1"><LockIcon size={14} /> Locked</span>}
          {t.solved_post_id && <span className="inline-flex items-center gap-1 text-ok"><CheckIcon size={14} /> Solved</span>}
          {t.is_official && <span className="chip bg-gold-wash text-gold-bright">Official · Upper Echelon staff</span>}
          <span>
            Started by{" "}
            {opAuthor ? (
              <Link href={`/u/${opAuthor.username}`} style={{ color: tierColor(opAuthor.tier) }} className="hover:underline">
                {opAuthor.display_name}
              </Link>
            ) : (
              "a former member"
            )}{" "}
            · {formatDate(t.created_at)}
          </span>
          <span className="inline-flex items-center gap-1"><EyeIcon size={14} /> {(t.view_count + 1).toLocaleString("en-GB")}</span>
          <span>{t.reply_count} {t.reply_count === 1 ? "reply" : "replies"}</span>
        </p>
        {t.tags.length > 0 && (
          <ul className="flex flex-wrap gap-1.5">
            {t.tags.map((tag) => (
              <li key={tag}>
                <Link href={`/forum/tags/${tag}`} className="chip hover:text-ink">#{tag}</Link>
              </li>
            ))}
          </ul>
        )}
      </header>

      {t.removed_at && (
        <Notice tone="error" title="This thread was removed by a moderator.">
          {t.removed_reason ? `Reason: ${t.removed_reason}. ` : ""}Only you and the moderators can see it.
        </Notice>
      )}

      {solution && (
        <a href={`#r${solution.id}`} className="block rounded-[14px] border border-ok/30 bg-ok-wash px-5 py-4 text-ok hover:brightness-110">
          <span className="inline-flex items-center gap-2 font-medium"><CheckIcon size={16} /> Answer by {solution.author?.display_name ?? "a former member"}</span>
          <span className="mt-1 block text-small text-ink-2">{excerpt(solution.body, 180)}</span>
        </a>
      )}

      <div className="flex flex-col gap-4">
        <PostCard
          id="op"
          number={1}
          author={opAuthor}
          isOp
          createdAt={t.created_at}
          editedAt={t.edited_at}
          footer={
            <>
              <VoteButton
                key={`t-${t.score}-${votedThread}`}
                kind="thread"
                id={t.id}
                threadId={t.id}
                count={t.score}
                on={votedThread}
                disabled={!isMember || isAuthor}
                disabledReason={isAuthor ? "You cannot vote for your own writing." : "Sign in to vote."}
              />
              <ThreadControls
                thread={{ id: t.id, title: t.title, body: t.body, tags: t.tags, is_pinned: t.is_pinned, is_locked: t.is_locked, removed_at: t.removed_at, category_id: t.category_id, reply_count: t.reply_count }}
                isMember={isMember}
                isAuthor={isAuthor}
                isModerator={isModerator}
                bookmarked={bookmarked}
                following={following}
                categories={cats ?? []}
              />
            </>
          }
        >
          <div className="prose-ue max-w-none" dangerouslySetInnerHTML={{ __html: bodyHtml }} />
          {poll && (
            <div className="mt-6 max-w-xl">
              <PollView poll={poll} results={pollResults} mine={myPoll} threadId={t.id} isMember={isMember} closed={!!poll.closes_at && new Date(poll.closes_at).getTime() < now} />
            </div>
          )}
        </PostCard>

        {replies.map((p, i) => {
          const name = p.author?.display_name ?? "A former member";
          const mine = viewer?.id === p.author_id;
          return (
            <PostCard
              key={p.id}
              id={`r${p.id}`}
              number={i + 2}
              author={p.author as Author}
              isOp={p.author_id === t.author_id}
              createdAt={p.created_at}
              editedAt={p.edited_at}
              solved={p.id === t.solved_post_id}
              footer={
                <>
                  <VoteButton
                    key={`p-${p.id}-${p.score}-${votedPosts.has(p.id)}`}
                    kind="post"
                    id={p.id}
                    threadId={t.id}
                    count={p.score}
                    on={votedPosts.has(p.id)}
                    disabled={!isMember || mine}
                    disabledReason={mine ? "You cannot vote for your own writing." : "Sign in to vote."}
                  />
                  <PostControls
                    post={{ id: p.id, body: p.body, removed_at: p.removed_at, edited_at: p.edited_at }}
                    threadId={t.id}
                    authorName={name}
                    authorUsername={(p.author?.username as string | undefined) ?? null}
                    isMember={isMember}
                    isAuthor={mine}
                    isModerator={isModerator}
                    canMarkSolution={canMarkSolution && !mine}
                    isSolution={p.id === t.solved_post_id}
                    locked={t.is_locked}
                  />
                </>
              }
            >
              {p.removed_at && (
                <Notice tone="error" className="mb-3">
                  Removed by a moderator{p.removed_reason ? `: ${p.removed_reason}` : ""}. Visible only to you and the moderators.
                </Notice>
              )}
              <div className="prose-ue max-w-none" dangerouslySetInnerHTML={{ __html: p.html }} />
            </PostCard>
          );
        })}
        <LiveReplies threadId={t.id} viewerId={viewer?.id ?? null} />
      </div>

      <section aria-labelledby="reply-h" className="panel">
        <h2 id="reply-h" className="panel-head">Your reply</h2>
        <div className="p-4 sm:p-5">
          {t.is_locked && !isModerator ? (
            <Notice title="This thread is locked.">No new replies can be added.</Notice>
          ) : t.removed_at ? null : !viewer ? (
            <div className="flex flex-wrap items-center gap-4">
              <p className="text-ink-2">Members can reply, vote and follow threads.</p>
              <ButtonLink href="/join" size="sm">Begin your initiation</ButtonLink>
              <Link href={`/login?next=/forum/t/${t.id}`} className="text-small text-ink underline">Sign in</Link>
            </div>
          ) : viewer.mute ? (
            <Notice tone="warning" title="You are muted.">You can read and vote, but not reply, until the mute ends.</Notice>
          ) : !viewer.profile.onboarded_at ? (
            <Notice>Finish your <Link href="/initiation" className="underline">initiation</Link> to reply.</Notice>
          ) : (
            <ReplyForm threadId={t.id} initialDraft={draft} />
          )}
        </div>
      </section>
    </HubPage>
  );
}
