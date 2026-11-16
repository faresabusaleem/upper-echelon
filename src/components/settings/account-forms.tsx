"use client";

import { useTransition, useState } from "react";
import { changeEmailAction, changePasswordAction, linkGoogleAction, unlinkIdentityAction } from "@/app/(main)/settings/actions";
import { PasswordInput } from "@/components/auth/password-input";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { SubmitButton } from "@/components/ui/submit-button";
import { ActionForm, useFieldErrors } from "./action-form";

export function EmailForm({ email }: { email: string | null }) {
  return (
    <ActionForm action={changeEmailAction}>
      <EmailFields email={email} />
      <div>
        <SubmitButton variant="secondary" pendingLabel="Sending…">Change email</SubmitButton>
      </div>
    </ActionForm>
  );
}
function EmailFields({ email }: { email: string | null }) {
  const errors = useFieldErrors();
  return (
    <Field label="Email address" htmlFor="email" error={errors.email} hint={`Currently ${email ?? "not set"}. Never shown publicly.`}>
      <Input id="email" name="email" type="email" autoComplete="email" required />
    </Field>
  );
}

export function PasswordForm({ hasPassword }: { hasPassword: boolean }) {
  return (
    <ActionForm action={changePasswordAction}>
      <PasswordFields hasPassword={hasPassword} />
      <div>
        <SubmitButton variant="secondary" pendingLabel="Saving…">{hasPassword ? "Change password" : "Set a password"}</SubmitButton>
      </div>
    </ActionForm>
  );
}
function PasswordFields({ hasPassword }: { hasPassword: boolean }) {
  const errors = useFieldErrors();
  return (
    <>
      {!hasPassword && <p className="text-small text-muted">You sign in with Google. Setting a password adds email sign-in.</p>}
      <Field label="New password" htmlFor="password" error={errors.password} hint="At least 10 characters, with a letter and a number.">
        <PasswordInput id="password" name="password" autoComplete="new-password" required />
      </Field>
      <Field label="Repeat it" htmlFor="confirm" error={errors.confirm}>
        <PasswordInput id="confirm" name="confirm" autoComplete="new-password" required />
      </Field>
      {errors.nonce && (
        <Field label="Code from your email" htmlFor="nonce" error={errors.nonce}>
          <Input id="nonce" name="nonce" inputMode="numeric" autoComplete="one-time-code" />
        </Field>
      )}
    </>
  );
}

export function Identities({ providers, googleEnabled }: { providers: string[]; googleEnabled: boolean }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const label = (p: string) => (p === "email" ? "Email and password" : p === "google" ? "Google" : p);
  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col">
        {providers.map((p) => (
          <li key={p} className="flex items-center justify-between py-3">
            <span className="text-ink">{label(p)}</span>
            {providers.length > 1 && (
              <Button
                variant="quiet"
                size="sm"
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    const r = await unlinkIdentityAction(p);
                    setMsg({ ok: r.ok, text: r.ok ? (r.message ?? "Done.") : r.message });
                  })
                }
              >
                Disconnect
              </Button>
            )}
          </li>
        ))}
      </ul>
      {googleEnabled && !providers.includes("google") && (
        <form action={linkGoogleAction}>
          <Button type="submit" variant="secondary">Connect Google</Button>
        </form>
      )}
      {msg && <Notice tone={msg.ok ? "success" : "error"}>{msg.text}</Notice>}
    </div>
  );
}
