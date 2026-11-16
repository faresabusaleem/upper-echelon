import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import { getViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { excerpt, renderMarkdown } from "@/lib/markdown";
import { Avatar } from "@/components/ui/avatar";
import { ButtonLink } from "@/components/ui/button";
import { CheckIcon, LockIcon, PinIcon } from "@/components/ui/icons";
import { Notice } from "@/components/ui/notice";
import { StaffMark, TierMark } from "@/components/ui/tier-mark";
import { LiveReplies, PollView, PostControls, ReplyForm, ThreadControls, VoteButton } from "@/components/forum/thread-client";
import { formatDate, slugify, timeAgo } from "@/lib/utils";

type Props = PageProps<"/forum/t/[id]/[[...slug]]">;

async function loadThread(id: number) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("threads")
    .select("*, category:forum_categories(id, slug, name, is_advice), author:profiles!threads_author_id_fkey(id, username, display_name, avatar_url, tier, is_staff, role)")
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

export default async function ThreadPage({ params }: Props) {
  const { id: rawId, slug } = await params;
  const id = Number(rawId);
  if (!Number.isInteger(id)) notFound();
  const t = await loadThread(id);
  if (!t) notFound();
  const expected = slugify(t.title);
  if (slug?.[0] !== expected) permanentRedirect(`/forum/t/${t.id}/${expected}`);

  const viewer = await getViewer();
  const supabase = await createClient();
  const isMember = !!viewer?.profile.onboarded_at && !viewer.ban;
  const isModerator = !!viewer?.isModerator;
  const isAuthor = !!viewer && viewer.id === t.author_id;

  const [{ data: posts }, { data: poll }, myVotes, extras, { data: cats }] = await Promise.all([
    supabase
      .from("posts")
      .select("*, author:profiles!posts_author_id_fkey(id, username, display_name, avatar_url, tier, is_staff, role)")
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

  const authorName = t.author?.display_name ?? "A former member";

  return (
    <article className="mx-auto w-full max-w-5xl px-[var(--gutter)] pb-10 pt-10 sm:pt-14">
      <nav aria-label="Breadcrumb" className="text-small text-muted">
        <Link href="/forum" className="hover:text-ink">The Forum</Link>
        <span aria-hidden> / </span>
        <Link href={`/forum/c/${t.category?.slug}`} className="hover:text-ink">{t.category?.name}</Link>
      </nav>
      <header className="mt-4">
        <h1 className="font-display text-display-m text-ink">{t.title}</h1>
        <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-small text-muted">
          {t.is_pinned && <span className="inline-flex items-center gap-1 text-gold"><PinIcon size={15} /> Pinned</span>}
          {t.is_locked && <span className="inline-flex items-center gap-1"><LockIcon size={15} /> Locked</span>}
          {t.solved_post_id && <span className="inline-flex items-center gap-1 text-ok"><CheckIcon size={15} /> Solved</span>}
          {t.is_official && <span className="bg-gold-wash px-2 py-0.5 text-gold-bright">Official · Upper Echelon staff</span>}
          <span>Started {formatDate(t.created_at)}</span>
          {t.edited_at && <span>· edited {timeAgo(t.edited_at)}</span>}
        </p>
        {t.tags.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {t.tags.map((tag) => (
              <li key={tag}><Link href={`/forum/tags/${tag}`} className="bg-panel px-2 py-0.5 text-micro text-ink-2 hover:text-ink">#{tag}</Link></li>
            ))}
          </ul>
        )}
      </header>

      {t.removed_at && (
        <Notice tone="error" className="mt-8" title="This thread was removed by a moderator.">
          {t.removed_reason ? `Reason: ${t.removed_reason}. ` : ""}Only you and the moderators can see it.
        </Notice>
      )}

      <section aria-label="Opening post" className="mt-10 grid grid-cols-[auto_1fr] gap-x-5">
        <Avatar src={t.author?.avatar_url} name={authorName} size={44} />
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            {t.author ? <Link href={`/u/${t.author.username}`} className="text-ink hover:text-gold-bright">{authorName}</Link> : <span className="text-ink-2">{authorName}</span>}
            {t.author && <TierMark tier={t.author.tier} />}
            {t.author?.is_staff && <StaffMark />}
          </p>
          <div className="prose-ue mt-4" dangerouslySetInnerHTML={{ __html: bodyHtml }} />
          {poll && (
            <div className="mt-8 max-w-xl">
              <PollView poll={poll} results={pollResults} mine={myPoll} threadId={t.id} isMember={isMember} closed={!!poll.closes_at && new Date(poll.closes_at).getTime() < now} />
            </div>
          )}
          <div className="mt-6 flex flex-wrap items-start gap-3">
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
          </div>
        </div>
      </section>

      {solution && (
        <a href={`#r${solution.id}`} className="mt-10 block bg-ok-wash px-5 py-4 text-ok hover:brightness-110">
          <span className="inline-flex items-center gap-2 font-medium"><CheckIcon size={16} /> Answer by {solution.author?.display_name ?? "a former member"}</span>
          <span className="mt-1 block text-small text-ink-2">{excerpt(solution.body, 180)}</span>
        </a>
      )}

      <section aria-labelledby="replies-h" className="mt-16">
        <h2 id="replies-h" className="font-display text-display-s text-ink">
          {replies.length} {replies.length === 1 ? "reply" : "replies"}
        </h2>
        <ol className="mt-6 flex flex-col">
          {replies.map((p) => {
            const name = p.author?.display_name ?? "A former member";
            const mine = viewer?.id === p.author_id;
            return (
              <li
                key={p.id}
                id={`r${p.id}`}
                className={`grid scroll-mt-28 grid-cols-[auto_1fr] gap-x-5 py-8 ${p.id === t.solved_post_id ? "bg-ok-wash/40 px-3" : ""}`}
              >
                <Avatar src={p.author?.avatar_url} name={name} size={40} />
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-small">
                    {p.author ? <Link href={`/u/${p.author.username}`} className="text-[1rem] text-ink hover:text-gold-bright">{name}</Link> : <span className="text-ink-2">{name}</span>}
                    {p.author && <TierMark tier={p.author.tier} />}
                    {p.author?.is_staff && <StaffMark />}
                    {p.author_id === t.author_id && p.author && <span className="text-muted">author</span>}
                    <a href={`#r${p.id}`} className="text-muted hover:text-ink">{timeAgo(p.created_at)}</a>
                    {p.edited_at && <span className="text-muted">· edited</span>}
                    {p.id === t.solved_post_id && <span className="inline-flex items-center gap-1 text-ok"><CheckIcon size={14} /> The answer</span>}
                  </p>
                  {p.removed_at && (
                    <Notice tone="error" className="mt-3">Removed by a moderator{p.removed_reason ? `: ${p.removed_reason}` : ""}. Visible only to you and the moderators.</Notice>
                  )}
                  <div className="prose-ue mt-3" dangerouslySetInnerHTML={{ __html: p.html }} />
                  <div className="mt-4 flex flex-wrap items-start gap-3">
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
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
        <LiveReplies threadId={t.id} viewerId={viewer?.id ?? null} />
      </section>

      <section aria-labelledby="reply-h" className="mt-12">
        <h2 id="reply-h" className="font-display text-display-s text-ink">Your reply</h2>
        <div className="mt-5">
          {t.is_locked && !isModerator ? (
            <Notice title="This thread is locked.">No new replies can be added.</Notice>
          ) : t.removed_at ? null : !viewer ? (
            <div className="flex flex-wrap items-center gap-4 bg-raised px-5 py-5">
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
    </article>
  );
}
