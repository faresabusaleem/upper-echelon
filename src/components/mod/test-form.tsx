"use client";

import { useActionState, useTransition } from "react";
import { deleteTestAction, saveTestAction, type AdminState } from "@/app/(main)/admin/actions";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { SubmitButton } from "@/components/ui/submit-button";

type Test = Record<string, string | number | boolean | null>;

export function TestForm({ test }: { test?: Test }) {
  const [state, action] = useActionState<AdminState, FormData>(saveTestAction, null);
  const [pending, start] = useTransition();
  const e = state && !state.ok ? (state.fieldErrors ?? {}) : {};
  const v = (k: string) => (test?.[k] == null ? "" : String(test[k]));
  return (
    <form action={action} className="flex max-w-3xl flex-col gap-6">
      {test && <input type="hidden" name="id" value={v("id")} />}
      <div className="grid gap-6 sm:grid-cols-2">
        <Field label="Name" htmlFor="name" error={e.name}><Input id="name" name="name" defaultValue={v("name")} required /></Field>
        <Field label="Address (slug)" htmlFor="slug" optional hint="Generated from the name if empty."><Input id="slug" name="slug" defaultValue={v("slug")} /></Field>
        <Field label="Author" htmlFor="author" error={e.author}><Input id="author" name="author" defaultValue={v("author")} required /></Field>
        <Field label="Organisation" htmlFor="organisation" optional><Input id="organisation" name="organisation" defaultValue={v("organisation")} /></Field>
      </div>
      <Field label="What it measures" htmlFor="measures" error={e.measures}><Textarea id="measures" name="measures" defaultValue={v("measures")} required className="min-h-20" /></Field>
      <Field label="Format" htmlFor="format" optional><Input id="format" name="format" defaultValue={v("format")} /></Field>
      <div className="grid gap-6 sm:grid-cols-3">
        <Field label="Items" htmlFor="item_count" optional error={e.item_count}><Input id="item_count" name="item_count" type="number" defaultValue={v("item_count")} /></Field>
        <Field label="Difficulty (editorial)" htmlFor="difficulty">
          <Select id="difficulty" name="difficulty" defaultValue={v("difficulty") || "hard"}>
            <option value="moderate">Moderate</option><option value="hard">Hard</option><option value="very_hard">Very hard</option><option value="extreme">Extreme</option>
          </Select>
        </Field>
        <Field label="Free?" htmlFor="is_free">
          <Select id="is_free" name="is_free" defaultValue={test?.is_free === true ? "yes" : test?.is_free === false ? "no" : "unknown"}>
            <option value="unknown">Not stated</option><option value="yes">Free</option><option value="no">Paid</option>
          </Select>
        </Field>
        <Field label="Ceiling" htmlFor="ceiling" optional><Input id="ceiling" name="ceiling" defaultValue={v("ceiling")} /></Field>
        <Field label="Time" htmlFor="duration" optional><Input id="duration" name="duration" defaultValue={v("duration")} /></Field>
        <Field label="Cost" htmlFor="cost" optional><Input id="cost" name="cost" defaultValue={v("cost")} /></Field>
      </div>
      <div className="grid gap-6 sm:grid-cols-3">
        <Field label="Official link" htmlFor="url" error={e.url} className="sm:col-span-2"><Input id="url" name="url" type="url" defaultValue={v("url")} required /></Field>
        <Field label="Link status" htmlFor="link_status">
          <Select id="link_status" name="link_status" defaultValue={v("link_status") || "ok"}><option value="ok">Reachable</option><option value="unreachable">Unreachable</option></Select>
        </Field>
        <Field label="Scores reported as" htmlFor="score_scale"><Input id="score_scale" name="score_scale" defaultValue={v("score_scale") || "IQ (SD 15)"} /></Field>
        <Field label="Position" htmlFor="position"><Input id="position" name="position" type="number" defaultValue={v("position") || "100"} /></Field>
      </div>
      <Field label="Notes" htmlFor="notes" optional><Textarea id="notes" name="notes" defaultValue={v("notes")} className="min-h-20" /></Field>
      <Checkbox name="supervised" defaultChecked={test?.supervised === true} label="Supervised (proctored)" />
      <Checkbox name="is_published" defaultChecked={test ? test.is_published === true : true} label="Published in the Directory" />
      {state && !state.ok && <Notice tone="error">{state.message}</Notice>}
      <div className="flex flex-wrap gap-3">
        <SubmitButton pendingLabel="Saving…">{test ? "Save changes" : "Add to the Directory"}</SubmitButton>
        {test && (
          <Button type="button" variant="danger" disabled={pending} onClick={() => { if (window.confirm("Delete this test and every result logged against it?")) start(async () => void (await deleteTestAction(v("id")))); }}>
            Delete
          </Button>
        )}
      </div>
    </form>
  );
}
