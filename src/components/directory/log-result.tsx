"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { deleteResultAction, logResultAction, setResultHiddenAction, type DirState } from "@/app/(main)/directory/actions";
import { SCALES } from "@/lib/directory";
import { prepareImage, uploadImage } from "@/lib/image-client";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { SubmitButton } from "@/components/ui/submit-button";
import { formatDate } from "@/lib/utils";

export function LogResultForm({ testId, slug, scale }: { testId: string; slug: string; scale: string }) {
  const [state, action] = useActionState<DirState, FormData>(logResultAction, null);
  const [proof, setProof] = useState<string>("");
  const [proofName, setProofName] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const errors = state && !state.ok ? (state.fieldErrors ?? {}) : {};

  return (
    <form action={action} className="flex flex-col gap-6">
      <input type="hidden" name="test_id" value={testId} />
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="proof_path" value={proof} />
      <div className="grid gap-6 sm:grid-cols-2">
        <Field label="Your score" htmlFor="score" error={errors.score}>
          <Input id="score" name="score" type="number" step="0.01" min="0" max="1000" required className="figure" />
        </Field>
        <Field label="Scale" htmlFor="scale">
          <Select id="scale" name="scale" defaultValue={scale}>
            {Object.entries(SCALES).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label="Date taken" htmlFor="taken_on" optional error={errors.taken_on}>
        <Input id="taken_on" name="taken_on" type="date" max={new Date().toISOString().slice(0, 10)} />
      </Field>
      <Field label="A note" htmlFor="note" optional hint="Up to 280 characters. No answers or hints about the test.">
        <Textarea id="note" name="note" maxLength={280} className="min-h-20" />
      </Field>
      <div className="flex flex-col gap-2">
        <span className="text-small text-ink-2">
          Proof <span className="text-muted">(optional)</span>
        </span>
        <div className="flex flex-wrap items-center gap-4">
          <Button type="button" variant="secondary" size="sm" disabled={uploading} onClick={() => fileRef.current?.click()}>
            {uploading ? "Uploading…" : proof ? "Replace screenshot" : "Attach a screenshot"}
          </Button>
          {proofName && <span className="text-small text-muted">{proofName}</span>}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (!f) return;
            setUploading(true);
            setUploadError(null);
            try {
              const res = await uploadImage(await prepareImage(f), "proof");
              setProof(res.path ?? "");
              setProofName(f.name);
            } catch (err) {
              setUploadError(err instanceof Error ? err.message : "Upload failed.");
            } finally {
              setUploading(false);
            }
          }}
        />
        <p className="text-micro text-muted">Visible to people who can see your test results. Crop out anything personal first.</p>
        {uploadError && <Notice tone="error">{uploadError}</Notice>}
      </div>
      <Checkbox name="is_hidden" label="Keep this result hidden from everyone but me." />
      {state && <Notice tone={state.ok ? "success" : state.kind === "rate_limited" ? "warning" : "error"}>{state.message}</Notice>}
      <div>
        <SubmitButton pendingLabel="Logging…">Log the result</SubmitButton>
      </div>
    </form>
  );
}

export function MyResults({
  results,
  slug,
}: {
  results: Array<{ id: string; score: number; scale: string; taken_on: string | null; is_hidden: boolean; created_at: string }>;
  slug: string;
}) {
  const [pending, start] = useTransition();
  if (results.length === 0) return null;
  return (
    <ul className="flex flex-col">
      {results.map((r) => (
        <li key={r.id} className="flex flex-wrap items-center justify-between gap-4 py-3">
          <span>
            <span className="figure text-xl text-ink">{r.score}</span> <span className="text-small text-muted">{SCALES[r.scale]}</span>
            <span className="block text-small text-muted">
              {r.taken_on ? `Taken ${formatDate(r.taken_on)}` : `Logged ${formatDate(r.created_at)}`}
              {r.is_hidden ? " · hidden" : " · visible"}
            </span>
          </span>
          <span className="flex gap-2">
            <Button variant="quiet" size="sm" disabled={pending} onClick={() => start(async () => void (await setResultHiddenAction(r.id, !r.is_hidden, slug)))}>
              {r.is_hidden ? "Show" : "Hide"}
            </Button>
            <Button variant="danger" size="sm" disabled={pending} onClick={() => start(async () => void (await deleteResultAction(r.id, slug)))}>
              Delete
            </Button>
          </span>
        </li>
      ))}
    </ul>
  );
}
