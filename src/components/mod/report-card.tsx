"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { modRemoveContentAction, resolveReportAction, sanctionAction } from "@/app/(main)/mod/actions";
import { Button } from "@/components/ui/button";
import { Field, Select, Textarea } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { timeAgo } from "@/lib/utils";
import { publicEnv } from "@/lib/env";

const REASONS: Record<string, string> = {
  spam: "Spam",
  harassment: "Harassment",
  hate: "Hate",
  sexual: "Sexual content",
  minor_safety: "Risk to a young person",
  self_harm: "Self-harm",
  violence: "Violence",
  cheating: "Cheating or answers",
  impersonation: "Impersonation",
  other: "Other",
};

export type ReportRow = {
  id: number;
  target_type: string;
  target_id: string;
  reason: string;
  details: string | null;
  snapshot: Record<string, unknown>;
  status: string;
  created_at: string;
  reporter: { username: string; display_name: string } | null;
  target_user: { id: string; username: string; display_name: string } | null;
  count: number;
};

export function ReportCard({ r }: { r: ReportRow }) {
  const [pending, start] = useTransition();
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [sanction, setSanction] = useState<"" | "warning" | "mute" | "ban">("");
  const [hours, setHours] = useState("24");
  const s = r.snapshot as Record<string, string | number | undefined>;
  const link =
    r.target_type === "thread" ? `/forum/t/${s.thread_id}` :
    r.target_type === "post" ? `/forum/t/${s.thread_id}#r${s.post_id}` :
    r.target_type === "profile" && r.target_user ? `/u/${r.target_user.username}` : null;
  const removable = ["thread", "post", "message", "image", "test_result"].includes(r.target_type);
  const run = (fn: () => Promise<{ ok: boolean; message?: string }>) =>
    start(async () => {
      const res = await fn();
      setMsg({ ok: res.ok, text: res.message ?? (res.ok ? "Done." : "Failed.") });
    });

  return (
    <article className="bg-raised p-5 sm:p-6">
      <header className="flex flex-wrap items-baseline justify-between gap-3">
        <p className="text-ink">
          <span className="bg-danger-wash px-2 py-0.5 text-small text-danger">{REASONS[r.reason] ?? r.reason}</span>{" "}
          <span className="ml-2 capitalize">{r.target_type.replace("_", " ")}</span>
          {r.target_user && (
            <> by <Link href={`/mod/members/${r.target_user.username}`} className="underline">@{r.target_user.username}</Link></>
          )}
          {r.count > 1 && <span className="ml-2 text-small text-gold-bright">{r.count} reports</span>}
        </p>
        <p className="text-small text-muted">
          {timeAgo(r.created_at)} · reported by {r.reporter ? `@${r.reporter.username}` : "a former member"}
        </p>
      </header>
      {r.details && <p className="mt-3 text-small text-ink-2">“{r.details}”</p>}
      <div className="mt-4 bg-sunk p-4 text-small text-ink-2">
        {s.title && <p className="font-display text-lg text-ink">{String(s.title)}</p>}
        {s.body && <p className="mt-1 whitespace-pre-wrap">{String(s.body).slice(0, 1500)}</p>}
        {s.bio !== undefined && <p>Name: {String(s.display_name)} · Bio: {String(s.bio ?? "—")}</p>}
        {s.path && <p>Image: {String(s.bucket)}/{String(s.path)}</p>}
        {s.score !== undefined && <p>Logged score: {String(s.score)} ({String(s.scale)}) {s.note ? `· “${String(s.note)}”` : ""}</p>}
        {s.avatar_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={String(s.avatar_url)} alt="Reported portrait" className="mt-3 max-h-40" />
        )}
        {s.path && s.bucket !== "proofs" && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`${publicEnv.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${String(s.path)}`} alt="Reported image" className="mt-3 max-h-60" />
        )}
        {link && <Link href={link} className="mt-2 inline-block text-ink underline">Open in context</Link>}
      </div>
      <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_auto]">
        <Field label="Note for the record" htmlFor={`note-${r.id}`} optional>
          <Textarea id={`note-${r.id}`} value={note} onChange={(e) => setNote(e.target.value)} className="min-h-16" maxLength={500} />
        </Field>
        <div className="flex flex-wrap items-end gap-2">
          {removable && (
            <Button size="sm" variant="danger" disabled={pending} onClick={() => run(async () => {
              const a = await modRemoveContentAction(r.target_type, r.target_id, true, note || REASONS[r.reason]);
              if (!a.ok) return a;
              return resolveReportAction(r.id, "actioned", note);
            })}>
              Remove and close
            </Button>
          )}
          <Button size="sm" variant="secondary" disabled={pending} onClick={() => run(() => resolveReportAction(r.id, "actioned", note))}>
            Close as actioned
          </Button>
          <Button size="sm" variant="quiet" disabled={pending} onClick={() => run(() => resolveReportAction(r.id, "dismissed", note))}>
            Dismiss
          </Button>
        </div>
      </div>
      {r.target_user && (
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <Field label="Sanction the author" htmlFor={`s-${r.id}`}>
            <Select id={`s-${r.id}`} value={sanction} onChange={(e) => setSanction(e.target.value as typeof sanction)} className="h-10 w-44 text-small">
              <option value="">None</option>
              <option value="warning">Warning</option>
              <option value="mute">Mute</option>
              <option value="ban">Ban</option>
            </Select>
          </Field>
          {(sanction === "mute" || sanction === "ban") && (
            <Field label="Duration" htmlFor={`h-${r.id}`}>
              <Select id={`h-${r.id}`} value={hours} onChange={(e) => setHours(e.target.value)} className="h-10 w-40 text-small">
                <option value="24">1 day</option>
                <option value="72">3 days</option>
                <option value="168">7 days</option>
                <option value="720">30 days</option>
                {sanction === "ban" && <option value="perm">Permanent</option>}
              </Select>
            </Field>
          )}
          {sanction && (
            <Button size="sm" variant="danger" disabled={pending} onClick={() => run(() => sanctionAction({
              userId: r.target_user!.id,
              kind: sanction,
              reason: note || `${REASONS[r.reason]} (report #${r.id})`,
              hours: hours === "perm" || sanction === "warning" ? null : Number(hours),
            }))}>
              Apply {sanction}
            </Button>
          )}
        </div>
      )}
      {msg && <Notice tone={msg.ok ? "success" : "error"} className="mt-4">{msg.text}</Notice>}
    </article>
  );
}
