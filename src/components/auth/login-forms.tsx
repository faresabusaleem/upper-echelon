"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { magicLinkAction, signInAction, type FormState } from "@/app/(auth)/actions";
import { Field, Input } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { SubmitButton } from "@/components/ui/submit-button";
import { Turnstile } from "@/components/ui/turnstile";
import { cn } from "@/lib/utils";
import { PasswordInput } from "./password-input";

export function LoginForms({ next }: { next: string }) {
  const [mode, setMode] = useState<"password" | "link">("password");
  const [pwState, pwAction] = useActionState<FormState, FormData>(signInAction, null);
  const [linkState, linkAction] = useActionState<FormState, FormData>(magicLinkAction, null);

  return (
    <div className="flex flex-col gap-8">
      <div role="tablist" aria-label="Sign-in method" className="flex gap-6">
        {(["password", "link"] as const).map((m) => (
          <button
            key={m}
            role="tab"
            aria-selected={mode === m}
            onClick={() => setMode(m)}
            className={cn(
              "pb-1 text-[1.0625rem]",
              mode === m ? "text-ink underline decoration-gold decoration-2 underline-offset-[0.45em]" : "text-muted hover:text-ink",
            )}
          >
            {m === "password" ? "Password" : "Email me a link"}
          </button>
        ))}
      </div>

      {mode === "password" ? (
        <form action={pwAction} className="flex flex-col gap-6" role="tabpanel">
          <input type="hidden" name="next" value={next} />
          <Field label="Email" htmlFor="email" error={pwState && !pwState.ok ? pwState.fieldErrors?.email : undefined}>
            <Input id="email" name="email" type="email" autoComplete="email" required />
          </Field>
          <Field label="Password" htmlFor="password">
            <PasswordInput id="password" name="password" autoComplete="current-password" required />
          </Field>
          {pwState && !pwState.ok && <Notice tone={pwState.kind === "rate_limited" ? "warning" : "error"}>{pwState.message}</Notice>}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <SubmitButton pendingLabel="Entering…">Enter</SubmitButton>
            <Link href="/reset-password" className="text-small text-ink-2 underline hover:text-ink">
              Forgotten your password?
            </Link>
          </div>
        </form>
      ) : (
        <form action={linkAction} className="flex flex-col gap-6" role="tabpanel">
          <input type="hidden" name="next" value={next} />
          <Field label="Email" htmlFor="link-email" hint="We will send a one-time sign-in link. No password needed.">
            <Input id="link-email" name="email" type="email" autoComplete="email" required />
          </Field>
          <Turnstile action="magic-link" />
          {linkState && (
            <Notice tone={linkState.ok ? "success" : linkState.kind === "rate_limited" ? "warning" : "error"}>
              {linkState.ok ? linkState.message : linkState.message}
            </Notice>
          )}
          <div>
            <SubmitButton pendingLabel="Sending…">Send the link</SubmitButton>
          </div>
        </form>
      )}
    </div>
  );
}
