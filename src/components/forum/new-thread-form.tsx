"use client";

import { useActionState, useMemo, useRef, useState } from "react";
import { createThreadAction, type ForumState } from "@/app/(main)/forum/actions";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { SubmitButton } from "@/components/ui/submit-button";
import { Editor } from "./editor";

export function NewThreadForm({
  categories,
  initialCategory,
  draft,
  directoryTestId,
}: {
  categories: Array<{ id: number; name: string; is_advice: boolean }>;
  initialCategory: number | null;
  draft: { title: string | null; body: string; category_id: number | null } | null;
  directoryTestId?: string | null;
}) {
  const [state, action] = useActionState<ForumState, FormData>(createThreadAction, null);
  const [category, setCategory] = useState<number | "">(initialCategory ?? draft?.category_id ?? "");
  const [poll, setPoll] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);
  const errors = state && !state.ok ? (state.fieldErrors ?? {}) : {};
  const draftTarget = useMemo(
    () => ({ threadId: null, categoryId: typeof category === "number" ? category : null, getTitle: () => titleRef.current?.value ?? "" }),
    [category],
  );

  return (
    <form action={action} className="flex flex-col gap-8">
      {directoryTestId && <input type="hidden" name="directory_test_id" value={directoryTestId} />}
      <div className="grid gap-6 sm:grid-cols-[1fr_16rem]">
        <Field label="Title" htmlFor="title" error={errors.title}>
          <Input ref={titleRef} id="title" name="title" maxLength={140} required defaultValue={draft?.title ?? ""} aria-invalid={!!errors.title} />
        </Field>
        <Field label="Room" htmlFor="category_id" error={errors.category_id}>
          <Select id="category_id" name="category_id" value={category} onChange={(e) => setCategory(Number(e.target.value))} required>
            <option value="" disabled>Choose a room</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label="Your opening post" htmlFor="new-body" error={errors.body}>
        <Editor
          id="new-body"
          label="Your opening post"
          defaultValue={draft?.body ?? ""}
          draftKey="ue-draft-new-thread"
          draft={draftTarget}
          minRows={14}
          invalid={!!errors.body}
          placeholder="Say what you mean. Show your working."
        />
      </Field>
      <Field label="Tags" htmlFor="tags" optional hint="Up to five, separated by commas: e.g. matrices, norms, fluid-reasoning">
        <Input id="tags" name="tags" maxLength={200} />
      </Field>
      <div className="flex flex-col gap-4">
        <Checkbox label="Add a poll" checked={poll} onChange={(e) => setPoll(e.currentTarget.checked)} />
        {poll && (
          <div className="flex flex-col gap-5 bg-raised p-5">
            <Field label="Question" htmlFor="poll_question">
              <Input id="poll_question" name="poll_question" maxLength={200} />
            </Field>
            <Field label="Options, one per line" htmlFor="poll_options" error={errors.poll_options} hint="Between two and ten.">
              <Textarea id="poll_options" name="poll_options" className="min-h-28" />
            </Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Closes after" htmlFor="poll_days">
                <Select id="poll_days" name="poll_days" defaultValue="7">
                  <option value="0">Never</option>
                  <option value="1">1 day</option>
                  <option value="3">3 days</option>
                  <option value="7">7 days</option>
                  <option value="30">30 days</option>
                </Select>
              </Field>
              <div className="flex items-end pb-3">
                <Checkbox name="poll_multiple" label="Allow more than one choice" />
              </div>
            </div>
          </div>
        )}
      </div>
      {state && !state.ok && <Notice tone={state.kind === "rate_limited" ? "warning" : "error"}>{state.message}</Notice>}
      <div className="flex flex-wrap items-center gap-6">
        <SubmitButton pendingLabel="Publishing…">Publish thread</SubmitButton>
        <p className="text-small text-muted">Keep to the community guidelines. No answers to live tests.</p>
      </div>
    </form>
  );
}
