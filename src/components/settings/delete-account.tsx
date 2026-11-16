"use client";

import { useState } from "react";
import { deleteAccountAction } from "@/app/(main)/settings/actions";
import { PasswordInput } from "@/components/auth/password-input";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { ActionForm, useFieldErrors } from "./action-form";

export function DeleteAccount({ username, hasPassword }: { username: string; hasPassword: boolean }) {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <div>
        <Button variant="danger" onClick={() => setOpen(true)}>
          Delete my account
        </Button>
      </div>
    );
  }
  return (
    <ActionForm action={deleteAccountAction}>
      <DeleteFields username={username} hasPassword={hasPassword} />
      <div className="flex gap-3">
        <SubmitButton variant="danger" pendingLabel="Deleting…">
          Delete everything, permanently
        </SubmitButton>
        <Button type="button" variant="quiet" onClick={() => setOpen(false)}>
          Keep my account
        </Button>
      </div>
    </ActionForm>
  );
}
function DeleteFields({ username, hasPassword }: { username: string; hasPassword: boolean }) {
  const errors = useFieldErrors();
  return (
    <>
      <p className="text-ink-2">
        This cannot be undone. Your profile, results, messages, images and posts are deleted. Threads that hold other
        members’ replies keep their title, with your opening post and name removed.
      </p>
      <Field label={`Type your username (${username}) to confirm`} htmlFor="confirm" error={errors.confirm}>
        <Input id="confirm" name="confirm" autoComplete="off" required />
      </Field>
      {hasPassword && (
        <Field label="Your password" htmlFor="password" error={errors.password}>
          <PasswordInput id="password" name="password" autoComplete="current-password" required />
        </Field>
      )}
    </>
  );
}
