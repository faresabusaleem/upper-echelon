"use client";

import { useState, useTransition } from "react";
import { reportAction } from "@/lib/actions/social";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Select, Textarea } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";

const REASONS: Array<[string, string]> = [
  ["spam", "Spam or advertising"],
  ["harassment", "Harassment or bullying"],
  ["hate", "Hate or discrimination"],
  ["sexual", "Sexual content"],
  ["minor_safety", "A risk to a young person"],
  ["self_harm", "Self-harm or suicide"],
  ["violence", "Threats or violence"],
  ["cheating", "Cheating, or sharing test answers"],
  ["impersonation", "Impersonation"],
  ["other", "Something else"],
];

export type ReportTarget = "thread" | "post" | "profile" | "message" | "image" | "test_result";

export function ReportDialog({
  open,
  onClose,
  targetType,
  targetId,
  subject,
}: {
  open: boolean;
  onClose: () => void;
  targetType: ReportTarget;
  targetId: string;
  subject: string;
}) {
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [result, setResult] = useState<{ ok: boolean; message?: string } | null>(null);
  const [pending, start] = useTransition();

  const close = () => {
    onClose();
    setTimeout(() => {
      setResult(null);
      setReason("");
      setDetails("");
    }, 200);
  };

  return (
    <Dialog open={open} onClose={close} title={`Report ${subject}`}>
      {result?.ok ? (
        <div className="flex flex-col gap-6">
          <Notice tone="success">{result.message}</Notice>
          <div>
            <Button onClick={close}>Close</Button>
          </div>
        </div>
      ) : (
        <form
          className="flex flex-col gap-5"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              const res = await reportAction({
                target_type: targetType,
                target_id: targetId,
                reason: reason as never,
                details: details || undefined,
              });
              setResult(res.ok ? { ok: true, message: res.message } : { ok: false, message: res.message });
            });
          }}
        >
          <p className="text-small text-ink-2">
            Reports are private. If someone is in immediate danger, contact local emergency services first.
          </p>
          <Field label="Reason" htmlFor="report-reason">
            <Select id="report-reason" value={reason} onChange={(e) => setReason(e.target.value)} required>
              <option value="" disabled>
                Choose a reason
              </option>
              {REASONS.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Anything else the moderators should know?" htmlFor="report-details" optional>
            <Textarea id="report-details" value={details} onChange={(e) => setDetails(e.target.value)} maxLength={1000} className="min-h-24" />
          </Field>
          {result && !result.ok && <Notice tone="error">{result.message}</Notice>}
          <div className="flex gap-3">
            <Button type="submit" disabled={!reason || pending}>
              {pending ? "Sending…" : "Send report"}
            </Button>
            <Button type="button" variant="quiet" onClick={close}>
              Cancel
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  );
}
