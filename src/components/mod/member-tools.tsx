"use client";

import { useState, useTransition } from "react";
import { revokeSanctionAction, sanctionAction, setRoleAction } from "@/app/(main)/mod/actions";
import { Button } from "@/components/ui/button";
import { Field, Select, Textarea } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { formatDate } from "@/lib/utils";

type Sanction = { id: number; kind: string; reason: string; created_at: string; expires_at: string | null; revoked_at: string | null };

export function MemberTools({
  userId,
  sanctions,
  role,
  isAdmin,
}: {
  userId: string;
  sanctions: Sanction[];
  role: string;
  isAdmin: boolean;
}) {
  const [kind, setKind] = useState<"warning" | "mute" | "ban">("warning");
  const [hours, setHours] = useState("24");
  const [reason, setReason] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<{ ok: boolean; message?: string }>) =>
    start(async () => {
      const r = await fn();
      setMsg({ ok: r.ok, text: r.message ?? (r.ok ? "Done." : "Failed.") });
    });
  return (
    <div className="flex flex-col gap-10">
      <section aria-labelledby="sanction-h" className="flex flex-col gap-4">
        <h2 id="sanction-h" className="font-display text-display-s text-ink">Sanction</h2>
        <div className="flex flex-wrap gap-4">
          <Field label="Kind" htmlFor="kind">
            <Select id="kind" value={kind} onChange={(e) => setKind(e.target.value as typeof kind)} className="w-44">
              <option value="warning">Warning</option>
              <option value="mute">Mute (no posting or messages)</option>
              <option value="ban">Ban (no access)</option>
            </Select>
          </Field>
          {kind !== "warning" && (
            <Field label="Duration" htmlFor="hours">
              <Select id="hours" value={hours} onChange={(e) => setHours(e.target.value)} className="w-44">
                <option value="24">1 day</option>
                <option value="72">3 days</option>
                <option value="168">7 days</option>
                <option value="720">30 days</option>
                <option value="perm">Permanent</option>
              </Select>
            </Field>
          )}
        </div>
        <Field label="Reason (the member will see it)" htmlFor="reason">
          <Textarea id="reason" value={reason} onChange={(e) => setReason(e.target.value)} className="min-h-20" maxLength={1000} />
        </Field>
        <div>
          <Button variant="danger" disabled={pending || reason.trim().length < 3} onClick={() => run(() => sanctionAction({ userId, kind, reason, hours: kind === "warning" || hours === "perm" ? null : Number(hours) }))}>
            Apply {kind}
          </Button>
        </div>
      </section>
      <section aria-labelledby="history-h">
        <h2 id="history-h" className="font-display text-display-s text-ink">History</h2>
        {sanctions.length ? (
          <ul className="mt-4 flex flex-col">
            {sanctions.map((s) => {
              const active = !s.revoked_at && (!s.expires_at || new Date(s.expires_at) > new Date());
              return (
                <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <span>
                    <span className="capitalize text-ink">{s.kind}</span>{" "}
                    <span className="text-small text-muted">
                      {formatDate(s.created_at)}
                      {s.expires_at ? ` · until ${formatDate(s.expires_at)}` : s.kind !== "warning" ? " · permanent" : ""}
                      {s.revoked_at ? " · lifted" : active ? " · active" : " · expired"}
                    </span>
                    <span className="block text-small text-ink-2">{s.reason}</span>
                  </span>
                  {active && s.kind !== "warning" && (
                    <Button size="sm" variant="secondary" disabled={pending} onClick={() => run(() => revokeSanctionAction(s.id))}>Lift</Button>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-4 text-muted">No sanctions.</p>
        )}
      </section>
      {isAdmin && (
        <section aria-labelledby="role-h" className="flex flex-col gap-4">
          <h2 id="role-h" className="font-display text-display-s text-ink">Role</h2>
          <Select defaultValue={role} aria-labelledby="role-h" className="w-56" onChange={(e) => run(() => setRoleAction(userId, e.target.value as "member" | "moderator" | "admin"))}>
            <option value="member">Member</option>
            <option value="moderator">Moderator</option>
            <option value="admin">Administrator</option>
          </Select>
        </section>
      )}
      {msg && <Notice tone={msg.ok ? "success" : "error"}>{msg.text}</Notice>}
    </div>
  );
}
