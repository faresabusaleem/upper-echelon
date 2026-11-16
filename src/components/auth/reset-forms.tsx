"use client";

import { useActionState } from "react";
import { resetRequestAction, updatePasswordAction, type FormState } from "@/app/(auth)/actions";
import { Field, Input } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { SubmitButton } from "@/components/ui/submit-button";
import { Turnstile } from "@/components/ui/turnstile";
import { PasswordInput } from "./password-input";

export function ResetRequestForm() {
  const [state, action] = useActionState<FormState, FormData>(resetRequestAction, null);
  return (
    <form action={action} className="mt-10 flex flex-col gap-6">
      <Field label="Email" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </Field>
      <Turnstile action="reset" />
      {state && <Notice tone={state.ok ? "success" : state.kind === "rate_limited" ? "warning" : "error"}>{state.message}</Notice>}
      <div>
        <SubmitButton pendingLabel="Sending…">Send the reset link</SubmitButton>
      </div>
    </form>
  );
}

export function UpdatePasswordForm() {
  const [state, action] = useActionState<FormState, FormData>(updatePasswordAction, null);
  const errors = state && !state.ok ? (state.fieldErrors ?? {}) : {};
  return (
    <form action={action} className="mt-10 flex flex-col gap-6">
      <Field label="New password" htmlFor="password" error={errors.password} hint="At least 10 characters, with a letter and a number.">
        <PasswordInput id="password" name="password" autoComplete="new-password" required />
      </Field>
      <Field label="Repeat it" htmlFor="confirm" error={errors.confirm}>
        <PasswordInput id="confirm" name="confirm" autoComplete="new-password" required />
      </Field>
      {state && !state.ok && !state.fieldErrors && <Notice tone="error">{state.message}</Notice>}
      <div>
        <SubmitButton pendingLabel="Saving…">Save the new password</SubmitButton>
      </div>
    </form>
  );
}
