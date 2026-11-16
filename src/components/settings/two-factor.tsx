"use client";

import { useState, useTransition } from "react";
import { enrollTwoFactorAction, setTwoFactorAction, signOutOthersAction } from "@/app/(main)/settings/actions";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { SubmitButton } from "@/components/ui/submit-button";
import { ActionForm } from "./action-form";

export function TwoFactor({ verifiedFactorId }: { verifiedFactorId: string | null }) {
  const [enroll, setEnroll] = useState<{ factorId: string; qr: string; secret: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (verifiedFactorId) {
    return (
      <div className="flex flex-col gap-4">
        <Notice tone="success">Two-factor authentication is on. You will be asked for a code when you sign in.</Notice>
        <ActionForm action={setTwoFactorAction}>
          <input type="hidden" name="intent" value="disable" />
          <input type="hidden" name="factorId" value={verifiedFactorId} />
          <div>
            <SubmitButton variant="danger" pendingLabel="Turning off…">Turn off two-factor</SubmitButton>
          </div>
        </ActionForm>
      </div>
    );
  }

  if (!enroll) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-ink-2">
          Add a second key: a six-digit code from an authenticator app such as 1Password, Google Authenticator or Aegis.
        </p>
        {error && <Notice tone="error">{error}</Notice>}
        <div>
          <Button
            disabled={pending}
            onClick={() =>
              start(async () => {
                const r = await enrollTwoFactorAction();
                if (r.ok) setEnroll(r.data);
                else setError(r.message);
              })
            }
          >
            {pending ? "Preparing…" : "Set up two-factor"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="text-ink-2">Scan this code with your authenticator app, then enter the code it shows.</p>
      <div className="w-fit bg-ink p-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={enroll.qr} alt="QR code for your authenticator app" width={192} height={192} />
      </div>
      <p className="text-small text-muted">
        Cannot scan? Enter this key by hand: <code className="figure select-all text-ink">{enroll.secret}</code>
      </p>
      <ActionForm action={setTwoFactorAction}>
        <input type="hidden" name="intent" value="verify" />
        <input type="hidden" name="factorId" value={enroll.factorId} />
        <Field label="Code" htmlFor="code">
          <Input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={7} className="figure max-w-48 text-xl tracking-[0.25em]" />
        </Field>
        <div>
          <SubmitButton pendingLabel="Checking…">Turn on two-factor</SubmitButton>
        </div>
      </ActionForm>
    </div>
  );
}

export function SignOutOthers() {
  const [pending, start] = useTransition();
  const [done, setDone] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-4">
      <p className="text-ink-2">Lost a device, or signed in somewhere public? End every other session.</p>
      <div>
        <Button variant="secondary" disabled={pending} onClick={() => start(async () => setDone((await signOutOthersAction()).message ?? "Done."))}>
          Sign out other devices
        </Button>
      </div>
      {done && <Notice tone="success">{done}</Notice>}
    </div>
  );
}
