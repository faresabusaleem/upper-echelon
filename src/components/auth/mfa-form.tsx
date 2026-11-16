"use client";

import { useActionState } from "react";
import { verifyMfaAction, type FormState } from "@/app/(auth)/actions";
import { Field, Input } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { SubmitButton } from "@/components/ui/submit-button";

export function MfaForm({ next }: { next: string }) {
  const [state, action] = useActionState<FormState, FormData>(verifyMfaAction, null);
  return (
    <form action={action} className="mt-10 flex flex-col gap-6">
      <input type="hidden" name="next" value={next} />
      <Field label="Code" htmlFor="code">
        <Input
          id="code"
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9 ]*"
          maxLength={7}
          autoFocus
          className="figure text-2xl tracking-[0.3em]"
        />
      </Field>
      {state && !state.ok && <Notice tone={state.kind === "rate_limited" ? "warning" : "error"}>{state.message}</Notice>}
      <div>
        <SubmitButton pendingLabel="Checking…">Verify</SubmitButton>
      </div>
    </form>
  );
}
