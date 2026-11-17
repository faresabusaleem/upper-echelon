"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useMemo, useState, useTransition } from "react";
import {
  createReplyAction,
  deleteReplyAction,
  deleteThreadAction,
  markSolutionAction,
  modMoveThreadAction,
  modRemoveAction,
  modThreadFlagsAction,
  toggleBookmarkAction,
  toggleFollowThreadAction,
  updateReplyAction,
  updateThreadAction,
  votePollAction,
  voteAction,
  type ForumState,
} from "@/app/(main)/forum/actions";
import { getRevisionsAction } from "@/app/(main)/forum/revisions";
import { getBrowserClient } from "@/lib/supabase/client";
import { ReportDialog } from "@/components/social/report-dialog";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Select } from "@/components/ui/field";
import { ArrowUpIcon, BookmarkIcon, CheckIcon, FlagIcon, PenIcon, ReplyIcon, TrashIcon } from "@/components/ui/icons";
import { Notice } from "@/components/ui/notice";
import { SubmitButton } from "@/components/ui/submit-button";
import { cn, timeAgo } from "@/lib/utils";
import { Editor } from "./editor";

export function VoteButton({
  kind,
  id,
  threadId,
  count,
  on,
  disabled,
  disabledReason,
}: {
  kind: "thread" | "post";
  id: number;
  threadId: number;
  count: number;
  on: boolean;
  disabled?: boolean;
  disabledReason?: string;
}) {
  const [state, setState] = useState({ count, on });
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <span className="inline-flex flex-col items-start">
      <button
        type="button"
        disabled={disabled || pending}
        title={disabled ? disabledReason : state.on ? "Withdraw your upvote" : "Upvote"}
        aria-pressed={state.on}
        aria-label={`${state.on ? "Withdraw upvote" : "Upvote"} (${state.count})`}
        onClick={() => {
          const next = { count: state.count + (state.on ? -1 : 1), on: !state.on };
          setState(next);
          start(async () => {
            const r = await voteAction(kind, id, next.on, threadId);
            if (!r.ok) {
              setState(state);
              setError(r.message);
            }
          });
        }}
        className={cn(
          "inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-small transition-colors disabled:cursor-not-allowed disabled:opacity-60",
          state.on ? "bg-gold-wash text-gold-bright" : "bg-panel text-ink-2 hover:bg-panel-2 hover:text-ink",
        )}
      >
        <ArrowUpIcon size={16} />
        <span className="figure">{state.count}</span>
      </button>
      {error && <span className="mt-1 text-micro text-danger">{error}</span>}
    </span>
  );
}

function Tool({ onClick, children, label, danger }: { onClick: () => void; children: React.ReactNode; label: string; danger?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn("inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-small hover:bg-panel", danger ? "text-danger" : "text-ink-2 hover:text-ink")}
    >
      {children}
      <span>{label}</span>
    </button>
  );
}

export function ThreadControls({
  thread,
  isMember,
  isAuthor,
  isModerator,
  bookmarked,
  following,
  categories,
}: {
  thread: { id: number; title: string; body: string; tags: string[]; is_pinned: boolean; is_locked: boolean; removed_at: string | null; category_id: number; reply_count: number };
  isMember: boolean;
  isAuthor: boolean;
  isModerator: boolean;
  bookmarked: boolean;
  following: boolean;
  categories: Array<{ id: number; name: string }>;
}) {
  const [bm, setBm] = useState(bookmarked);
  const [fo, setFo] = useState(following);
  const [report, setReport] = useState(false);
  const [editing, setEditing] = useState(false);
  const [history, setHistory] = useState(false);
  const [mod, setMod] = useState(false);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [editState, editAction] = useActionState<ForumState, FormData>(async (s, fd) => {
    const r = await updateThreadAction(s, fd);
    if (r?.ok) setEditing(false);
    return r;
  }, null);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-1">
        {isMember && (
          <>
            <Tool label={bm ? "Bookmarked" : "Bookmark"} onClick={() => start(async () => { setBm(!bm); await toggleBookmarkAction(thread.id, !bm); })}>
              <BookmarkIcon size={16} className={bm ? "fill-current text-gold" : ""} />
            </Tool>
            <Tool label={fo ? "Following" : "Follow"} onClick={() => start(async () => { setFo(!fo); await toggleFollowThreadAction(thread.id, !fo); })}>
              <CheckIcon size={16} className={fo ? "text-gold" : ""} />
            </Tool>
          </>
        )}
        {isAuthor && !thread.removed_at && (
          <Tool label="Edit" onClick={() => setEditing((e) => !e)}>
            <PenIcon size={16} />
          </Tool>
        )}
        {isAuthor && (
          <Tool
            label="Delete"
            danger
            onClick={() => {
              if (window.confirm("Delete this thread? This cannot be undone.")) start(async () => setMsg((await deleteThreadAction(thread.id))?.message ?? null));
            }}
          >
            <TrashIcon size={16} />
          </Tool>
        )}
        <Tool label="History" onClick={() => setHistory(true)}>
          <span aria-hidden className="text-muted">↺</span>
        </Tool>
        {isMember && !isAuthor && (
          <Tool label="Report" onClick={() => setReport(true)}>
            <FlagIcon size={16} />
          </Tool>
        )}
        {isModerator && (
          <Tool label="Moderate" onClick={() => setMod((m) => !m)}>
            <span aria-hidden className="text-gold">§</span>
          </Tool>
        )}
      </div>
      {msg && <Notice tone="error">{msg}</Notice>}
      {mod && (
        <div className="flex flex-wrap items-end gap-3 rounded-xl bg-gold-wash p-4">
          <Button size="sm" variant="secondary" disabled={pending} onClick={() => start(async () => void (await modThreadFlagsAction(thread.id, !thread.is_pinned, null)))}>
            {thread.is_pinned ? "Unpin" : "Pin"}
          </Button>
          <Button size="sm" variant="secondary" disabled={pending} onClick={() => start(async () => void (await modThreadFlagsAction(thread.id, null, !thread.is_locked)))}>
            {thread.is_locked ? "Unlock" : "Lock"}
          </Button>
          <Button
            size="sm"
            variant="danger"
            disabled={pending}
            onClick={() => {
              const reason = thread.removed_at ? "" : window.prompt("Reason for removal (shown to the author):") ?? "";
              if (!thread.removed_at && !reason) return;
              start(async () => void (await modRemoveAction("thread", thread.id, !thread.removed_at, reason, thread.id)));
            }}
          >
            {thread.removed_at ? "Restore" : "Remove"}
          </Button>
          <label className="flex items-center gap-2 text-small text-ink-2">
            Move to
            <Select
              defaultValue={thread.category_id}
              className="h-9 w-48 text-small"
              onChange={(e) => start(async () => void (await modMoveThreadAction(thread.id, Number(e.target.value))))}
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
          </label>
        </div>
      )}
      {editing && (
        <form action={editAction} className="flex flex-col gap-4 rounded-xl bg-panel p-4">
          <input type="hidden" name="id" value={thread.id} />
          <Field label="Title" htmlFor="edit-title">
            <Input id="edit-title" name="title" defaultValue={thread.title} maxLength={140} />
          </Field>
          <Editor id={`edit-thread-${thread.id}`} label="Opening post" defaultValue={thread.body} minRows={10} />
          <Field label="Tags" htmlFor="edit-tags" optional>
            <Input id="edit-tags" name="tags" defaultValue={thread.tags.join(", ")} />
          </Field>
          {editState && !editState.ok && <Notice tone="error">{editState.message}</Notice>}
          <div className="flex gap-3">
            <SubmitButton size="sm">Save changes</SubmitButton>
            <Button type="button" size="sm" variant="quiet" onClick={() => setEditing(false)}>Cancel</Button>
          </div>
        </form>
      )}
      <ReportDialog open={report} onClose={() => setReport(false)} targetType="thread" targetId={String(thread.id)} subject="this thread" />
      <HistoryDialog open={history} onClose={() => setHistory(false)} target={{ threadId: thread.id }} />
    </div>
  );
}

export function PostControls({
  post,
  threadId,
  authorName,
  authorUsername,
  isMember,
  isAuthor,
  isModerator,
  canMarkSolution,
  isSolution,
  locked,
}: {
  post: { id: number; body: string; removed_at: string | null; edited_at: string | null };
  threadId: number;
  authorName: string;
  authorUsername: string | null;
  isMember: boolean;
  isAuthor: boolean;
  isModerator: boolean;
  canMarkSolution: boolean;
  isSolution: boolean;
  locked: boolean;
}) {
  const [report, setReport] = useState(false);
  const [editing, setEditing] = useState(false);
  const [history, setHistory] = useState(false);
  const [pending, start] = useTransition();
  const [state, action] = useActionState<ForumState, FormData>(async (s, fd) => {
    const r = await updateReplyAction(s, fd);
    if (r?.ok) setEditing(false);
    return r;
  }, null);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-1">
        {isMember && !locked && !post.removed_at && (
          <Tool
            label="Quote"
            onClick={() => window.dispatchEvent(new CustomEvent("ue:quote", { detail: { author: authorUsername ?? authorName, text: post.body } }))}
          >
            <ReplyIcon size={16} />
          </Tool>
        )}
        {canMarkSolution && !post.removed_at && (
          <Tool label={isSolution ? "Unmark answer" : "Mark as answer"} onClick={() => start(async () => void (await markSolutionAction(threadId, isSolution ? null : post.id)))}>
            <CheckIcon size={16} className={isSolution ? "text-ok" : ""} />
          </Tool>
        )}
        {isAuthor && !post.removed_at && (
          <Tool label="Edit" onClick={() => setEditing((e) => !e)}>
            <PenIcon size={16} />
          </Tool>
        )}
        {isAuthor && (
          <Tool
            label="Delete"
            danger
            onClick={() => {
              if (window.confirm("Delete this reply? This cannot be undone.")) start(async () => void (await deleteReplyAction(post.id, threadId)));
            }}
          >
            <TrashIcon size={16} />
          </Tool>
        )}
        {post.edited_at && <Tool label="History" onClick={() => setHistory(true)}><span aria-hidden className="text-muted">↺</span></Tool>}
        {isMember && !isAuthor && (
          <Tool label="Report" onClick={() => setReport(true)}>
            <FlagIcon size={16} />
          </Tool>
        )}
        {isModerator && (
          <Tool
            label={post.removed_at ? "Restore" : "Remove"}
            danger={!post.removed_at}
            onClick={() => {
              const reason = post.removed_at ? "" : window.prompt("Reason for removal (shown to the author):") ?? "";
              if (!post.removed_at && !reason) return;
              start(async () => void (await modRemoveAction("post", post.id, !post.removed_at, reason, threadId)));
            }}
          >
            <span aria-hidden className="text-gold">§</span>
          </Tool>
        )}
      </div>
      {pending && <span className="sr-only" aria-live="polite">Working…</span>}
      {editing && (
        <form action={action} className="flex flex-col gap-3 rounded-xl bg-panel p-4">
          <input type="hidden" name="id" value={post.id} />
          <Editor id={`edit-post-${post.id}`} label="Edit reply" defaultValue={post.body} minRows={6} />
          {state && !state.ok && <Notice tone="error">{state.message}</Notice>}
          <div className="flex gap-3">
            <SubmitButton size="sm">Save</SubmitButton>
            <Button type="button" size="sm" variant="quiet" onClick={() => setEditing(false)}>Cancel</Button>
          </div>
        </form>
      )}
      <ReportDialog open={report} onClose={() => setReport(false)} targetType="post" targetId={String(post.id)} subject="this reply" />
      <HistoryDialog open={history} onClose={() => setHistory(false)} target={{ postId: post.id }} />
    </div>
  );
}

function HistoryDialog({ open, onClose, target }: { open: boolean; onClose: () => void; target: { threadId?: number; postId?: number } }) {
  const [rows, setRows] = useState<Array<{ id: number; title: string | null; body: string; created_at: string; editor: string | null }> | null>(null);
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void getRevisionsAction(target).then((r) => {
      if (!cancelled) setRows(r);
    });
    return () => {
      cancelled = true;
    };
  }, [open, target]);
  return (
    <Dialog
      open={open}
      onClose={() => {
        setRows(null);
        onClose();
      }}
      title="Edit history"
      wide
    >
      {!rows ? (
        <p className="text-muted">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-muted">Never edited.</p>
      ) : (
        <ol className="flex max-h-[60svh] flex-col gap-6 overflow-y-auto">
          {rows.map((r) => (
            <li key={r.id}>
              <p className="text-small text-muted">Version before the edit of {timeAgo(r.created_at)}{r.editor ? ` by ${r.editor}` : ""}</p>
              {r.title && <p className="mt-1 font-display text-lg text-ink">{r.title}</p>}
              <pre className="mt-2 whitespace-pre-wrap bg-panel p-3 font-sans text-small text-ink-2">{r.body}</pre>
            </li>
          ))}
        </ol>
      )}
    </Dialog>
  );
}

export function ReplyForm({ threadId, initialDraft }: { threadId: number; initialDraft: string }) {
  const router = useRouter();
  const [reset, setReset] = useState(0);
  const [state, action] = useActionState<ForumState, FormData>(async (s, fd) => {
    const r = await createReplyAction(s, fd);
    if (r?.ok) {
      try {
        localStorage.removeItem(`ue-draft-reply-${threadId}`);
      } catch {}
      setReset((n) => n + 1);
      router.refresh();
      const anchor = r.message;
      setTimeout(() => document.getElementById(anchor ?? "")?.scrollIntoView({ behavior: "smooth", block: "center" }), 600);
    }
    return r;
  }, null);
  const draft = useMemo(() => ({ threadId }), [threadId]);
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="thread_id" value={threadId} />
      <Editor
        key={reset}
        id="reply-body"
        label="Your reply"
        defaultValue={reset ? "" : initialDraft}
        draftKey={`ue-draft-reply-${threadId}`}
        draft={draft}
        acceptQuotes
        minRows={6}
        placeholder="Add to the argument."
      />
      {state && !state.ok && <Notice tone={state.kind === "rate_limited" ? "warning" : "error"}>{state.message}</Notice>}
      <div>
        <SubmitButton pendingLabel="Posting…">Post reply</SubmitButton>
      </div>
    </form>
  );
}

export function PollView({
  poll,
  results,
  mine,
  threadId,
  isMember,
  closed,
}: {
  closed: boolean;
  poll: { id: number; question: string; options: string[]; allow_multiple: boolean; closes_at: string | null };
  results: Record<number, number>;
  mine: number[];
  threadId: number;
  isMember: boolean;
}) {
  const [choice, setChoice] = useState<number[]>([]);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const voted = mine.length > 0;
  const showResults = voted || closed || !isMember;
  const total = Object.values(results).reduce((a, b) => a + b, 0);
  return (
    <section aria-labelledby={`poll-${poll.id}`} className="rounded-xl border border-line bg-panel p-5 sm:p-6">
      <h2 id={`poll-${poll.id}`} className="font-display text-xl text-ink">{poll.question}</h2>
      <p className="mt-1 text-small text-muted">
        {total} {total === 1 ? "vote" : "votes"}
        {poll.allow_multiple ? " · several choices allowed" : ""}
        {poll.closes_at ? (closed ? " · closed" : ` · closes ${timeAgo(poll.closes_at)}`) : ""}
      </p>
      <ul className="mt-5 flex flex-col gap-3">
        {poll.options.map((o, i) => {
          const n = results[i] ?? 0;
          const pct = total ? Math.round((n / total) * 100) : 0;
          return (
            <li key={i}>
              {showResults ? (
                <div>
                  <div className="flex justify-between gap-4 text-ink">
                    <span>{o}{mine.includes(i) && <span className="ml-2 text-small text-gold">your vote</span>}</span>
                    <span className="figure text-small text-ink-2">{pct}%</span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-panel-3"><div className="h-full rounded-full bg-gold" style={{ width: `${pct}%` }} /></div>
                </div>
              ) : (
                <label className="flex cursor-pointer items-center gap-3 text-ink">
                  <input
                    type={poll.allow_multiple ? "checkbox" : "radio"}
                    name={`poll-${poll.id}`}
                    checked={choice.includes(i)}
                    onChange={(e) => setChoice(poll.allow_multiple ? (e.target.checked ? [...choice, i] : choice.filter((c) => c !== i)) : [i])}
                    className="size-4 accent-[var(--color-gold)]"
                  />
                  {o}
                </label>
              )}
            </li>
          );
        })}
      </ul>
      {!showResults && (
        <Button
          className="mt-5"
          size="sm"
          disabled={pending || choice.length === 0}
          onClick={() => start(async () => { const r = await votePollAction(poll.id, choice, threadId); if (!r.ok) setError(r.message); })}
        >
          Vote
        </Button>
      )}
      {error && <Notice tone="error" className="mt-3">{error}</Notice>}
    </section>
  );
}

/** Live updates: new replies by others announce themselves; one click brings them in. */
export function LiveReplies({ threadId, viewerId }: { threadId: number; viewerId: string | null }) {
  const router = useRouter();
  const [fresh, setFresh] = useState(0);
  useEffect(() => {
    const supabase = getBrowserClient();
    const channel = supabase
      .channel(`thread:${threadId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "posts", filter: `thread_id=eq.${threadId}` }, (payload) => {
        if ((payload.new as { author_id?: string }).author_id !== viewerId) setFresh((n) => n + 1);
      })
      .subscribe();
    return () => void supabase.removeChannel(channel);
  }, [threadId, viewerId]);
  if (!fresh) return null;
  return (
    <div className="sticky bottom-4 z-20 flex justify-center" role="status">
      <button
        type="button"
        onClick={() => {
          setFresh(0);
          router.refresh();
        }}
        className="rounded-full bg-gold px-5 py-3 font-medium text-ground shadow-[0_12px_32px_rgba(0,0,0,0.5)] hover:bg-gold-bright"
      >
        {fresh} new {fresh === 1 ? "reply" : "replies"} · show
      </button>
    </div>
  );
}
