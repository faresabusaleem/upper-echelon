"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { clearConversationAction, deleteMessageAction, markReadAction, sendMessageAction } from "@/app/(main)/messages/actions";
import { blockAction } from "@/lib/actions/social";
import { getBrowserClient } from "@/lib/supabase/client";
import { ReportDialog } from "@/components/social/report-dialog";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { cn, timeAgo } from "@/lib/utils";

type Msg = { id: number; sender_id: string; body: string; created_at: string };

export function Conversation({
  conversationId,
  viewerId,
  otherId,
  otherName,
  initial,
  canSend,
  blocked,
  muted,
}: {
  conversationId: string;
  viewerId: string;
  otherId: string;
  otherName: string;
  initial: Msg[];
  canSend: boolean;
  blocked: boolean;
  muted: boolean;
}) {
  const [messages, setMessages] = useState<Msg[]>(initial);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [reportId, setReportId] = useState<number | null>(null);
  const [isBlocked, setBlocked] = useState(blocked);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  useEffect(() => {
    void markReadAction(conversationId);
    const supabase = getBrowserClient();
    const channel = supabase
      .channel(`conv:${conversationId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` }, (payload) => {
        const m = payload.new as Msg;
        setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
        if (m.sender_id !== viewerId) void markReadAction(conversationId);
      })
      .subscribe();
    return () => void supabase.removeChannel(channel);
  }, [conversationId, viewerId]);

  const send = () => {
    const body = text.trim();
    if (!body) return;
    setError(null);
    start(async () => {
      const r = await sendMessageAction(conversationId, body);
      if (r.ok) {
        setText("");
        setMessages((prev) => (prev.some((x) => x.id === r.data.id) ? prev : [...prev, { id: r.data.id, created_at: r.data.created_at, sender_id: viewerId, body }]));
      } else setError(r.message);
    });
  };

  return (
    <>
      <div className="mt-6 flex flex-wrap gap-2 text-small">
        <Button variant="quiet" size="sm" disabled={pending} onClick={() => start(async () => { const r = await blockAction(otherId, !isBlocked); if (r.ok) setBlocked(!isBlocked); })}>
          {isBlocked ? "Unblock" : "Block"}
        </Button>
        <Button
          variant="quiet"
          size="sm"
          disabled={pending}
          onClick={() => {
            if (window.confirm("Delete this conversation for you? The other member keeps their copy.")) start(async () => void (await clearConversationAction(conversationId)));
          }}
        >
          Delete conversation
        </Button>
      </div>
      <ol className="mt-6 flex min-h-[40svh] flex-1 flex-col gap-3" aria-live="polite" aria-label="Messages">
        {messages.length === 0 && <li className="text-muted">No messages yet. Say something considered.</li>}
        {messages.map((m) => {
          const mine = m.sender_id === viewerId;
          return (
            <li key={m.id} className={cn("group flex max-w-[85%] flex-col", mine ? "items-end self-end" : "items-start")}>
              <p className={cn("whitespace-pre-wrap break-words px-4 py-2.5", mine ? "bg-gold-wash text-ink" : "bg-panel text-ink")}>{m.body}</p>
              <span className="mt-1 flex gap-3 text-micro text-muted">
                {timeAgo(m.created_at)}
                {mine ? (
                  <button className="opacity-70 hover:text-danger group-hover:opacity-100" onClick={() => start(async () => { const r = await deleteMessageAction(m.id, conversationId); if (r.ok) setMessages((p) => p.filter((x) => x.id !== m.id)); })}>
                    Delete
                  </button>
                ) : (
                  <button className="opacity-70 hover:text-danger group-hover:opacity-100" onClick={() => setReportId(m.id)}>
                    Report
                  </button>
                )}
              </span>
            </li>
          );
        })}
        <div ref={endRef} />
      </ol>
      <div className="sticky bottom-0 mt-6 bg-ground pb-2 pt-3">
        {isBlocked ? (
          <Notice>You have blocked {otherName}. Unblock to write again.</Notice>
        ) : muted ? (
          <Notice tone="warning">You are muted and cannot send messages until the mute ends.</Notice>
        ) : !canSend ? (
          <Notice>{otherName} is not accepting messages from you right now.</Notice>
        ) : (
          <form
            className="flex items-end gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
          >
            <label htmlFor="msg" className="sr-only">Message</label>
            <textarea
              id="msg"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              rows={2}
              maxLength={4000}
              placeholder="Write a message. Enter to send, Shift+Enter for a new line."
              className="min-h-14 flex-1 resize-y border border-panel-3 bg-panel px-4 py-3 text-ink placeholder:text-faint focus:border-gold-deep focus:outline-none"
            />
            <Button type="submit" disabled={pending || !text.trim()}>Send</Button>
          </form>
        )}
        {error && <Notice tone={error.includes("faster") ? "warning" : "error"} className="mt-2">{error}</Notice>}
      </div>
      <ReportDialog open={reportId != null} onClose={() => setReportId(null)} targetType="message" targetId={String(reportId ?? "")} subject="this message" />
    </>
  );
}
