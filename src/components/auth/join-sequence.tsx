"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { checkUsername, signUpAction, type FormState } from "@/app/(auth)/actions";
import { Mark } from "@/components/brand/mark";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { SubmitButton } from "@/components/ui/submit-button";
import { Turnstile } from "@/components/ui/turnstile";
import { cn } from "@/lib/utils";
import { displayNameSchema, dobSchema, emailSchema, passwordSchema, usernameSchema } from "@/lib/validation";
import { InterestPicker } from "./interest-picker";
import { PasswordInput } from "./password-input";

const STEPS = [
  { key: "name", label: "Name", plane: "sagittal" },
  { key: "interests", label: "Interests", plane: "coronal" },
  { key: "seal", label: "Seal", plane: "transverse" },
] as const;

/**
 * The first half of the Initiation: a name, the subjects that matter, then the seal (email,
 * password, date of birth, the human check). Each step lights one plane of the mark.
 */
export function JoinSequence({ googleSlot }: { googleSlot?: React.ReactNode }) {
  const [step, setStep] = useState(0);
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [nameError, setNameError] = useState<string | undefined>();
  const [displayError, setDisplayError] = useState<string | undefined>();
  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [state, formAction] = useActionState<FormState, FormData>(signUpAction, null);
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, [step]);

  // Debounced availability check.
  useEffect(() => {
    setAvailable(null);
    const parsed = usernameSchema.safeParse(username);
    if (!parsed.success) return;
    setChecking(true);
    const t = setTimeout(async () => {
      const res = await checkUsername(parsed.data);
      setAvailable(res.available);
      setNameError(res.available ? undefined : res.message);
      setChecking(false);
    }, 350);
    return () => clearTimeout(t);
  }, [username]);

  useEffect(() => {
    if (state && !state.ok && state.fieldErrors?.username) setStep(0);
  }, [state]);

  const nextFromName = () => {
    const u = usernameSchema.safeParse(username);
    const d = displayNameSchema.safeParse(displayName || username);
    setNameError(u.success ? (available === false ? "That name is taken or reserved." : undefined) : u.error.issues[0].message);
    setDisplayError(d.success ? undefined : d.error.issues[0].message);
    if (u.success && d.success && available !== false) {
      if (!displayName) setDisplayName(username);
      setStep(1);
    }
  };

  const validateSeal = (form: HTMLFormElement) => {
    const fd = new FormData(form);
    const errs: Record<string, string> = {};
    const e = emailSchema.safeParse(fd.get("email"));
    if (!e.success) errs.email = e.error.issues[0].message;
    const p = passwordSchema.safeParse(fd.get("password"));
    if (!p.success) errs.password = p.error.issues[0].message;
    const d = dobSchema.safeParse(fd.get("date_of_birth"));
    if (!d.success) errs.date_of_birth = d.error.issues[0].message;
    if (!fd.get("terms")) errs.terms = "You must accept the terms and guidelines.";
    setClientErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const serverErrors = state && !state.ok ? (state.fieldErrors ?? {}) : {};
  const errors = { ...serverErrors, ...clientErrors };
  const plane = STEPS[step].plane;

  return (
    <div className="mx-auto grid w-full max-w-6xl flex-1 gap-10 px-[var(--gutter)] pb-16 pt-6 lg:grid-cols-[1fr_minmax(0,22rem)] lg:gap-20 lg:pt-14">
      <div className="flex flex-col">
        <ol aria-label="Steps of the Initiation" className="flex gap-6 text-small">
          {STEPS.map((s, i) => (
            <li key={s.key} aria-current={i === step ? "step" : undefined} className={cn(i === step ? "text-ink" : i < step ? "text-ink-2" : "text-muted")}>
              <span className={cn("mr-2 inline-block size-1.5 align-middle", i <= step ? "bg-gold" : "bg-panel-3")} aria-hidden />
              {s.label}
            </li>
          ))}
        </ol>

        <form
          action={formAction}
          onSubmit={(e) => {
            if (!validateSeal(e.currentTarget)) e.preventDefault();
          }}
          className="mt-12 flex max-w-xl flex-col"
          noValidate
        >
          <input type="hidden" name="username" value={username} />
          <input type="hidden" name="display_name" value={displayName || username} />

          {/* Step: name */}
          <section hidden={step !== 0} aria-labelledby="step-name" className="animate-rise">
            <h1 id="step-name" ref={step === 0 ? headingRef : undefined} tabIndex={-1} className="font-display text-display-l text-ink outline-none">
              What shall we call you?
            </h1>
            <p className="mt-4 text-ink-2">Your name is how the Echelon will know you. You can change it later.</p>
            <div className="mt-10 flex flex-col gap-6">
              <Field
                label="Username"
                htmlFor="username-input"
                error={nameError}
                hint={checking ? "Checking…" : available ? "Available." : "3–20 letters, numbers or underscores. Shown as @name."}
              >
                <Input
                  id="username-input"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.replace(/\s/g, ""))}
                  autoComplete="username"
                  autoCapitalize="off"
                  spellCheck={false}
                  aria-invalid={!!nameError}
                  aria-describedby={nameError ? "username-input-error" : "username-input-hint"}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), nextFromName())}
                />
              </Field>
              <Field label="Display name" htmlFor="display-input" error={displayError} hint="The name shown on your profile and posts.">
                <Input
                  id="display-input"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder={username || "Ada Lovelace"}
                  autoComplete="nickname"
                  aria-invalid={!!displayError}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), nextFromName())}
                />
              </Field>
              <div className="flex flex-wrap items-center gap-4">
                <Button type="button" onClick={nextFromName}>
                  Continue
                </Button>
              </div>
              {googleSlot && (
                <div className="mt-6 flex flex-col gap-3">
                  <p className="text-small text-muted">Or enter with your Google account and choose a name after.</p>
                  {googleSlot}
                </div>
              )}
            </div>
          </section>

          {/* Step: interests */}
          <section hidden={step !== 1} aria-labelledby="step-interests">
            <h1 id="step-interests" ref={step === 1 ? headingRef : undefined} tabIndex={-1} className="font-display text-display-l text-ink outline-none">
              What do you think about?
            </h1>
            <p className="mt-4 text-ink-2">Choose the subjects that hold your attention. They shape what you see first.</p>
            <div className="mt-10">
              <InterestPicker value={interests} onChange={setInterests} />
            </div>
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Button type="button" onClick={() => setStep(2)}>
                {interests.length ? "Continue" : "Skip for now"}
              </Button>
              <button type="button" onClick={() => setStep(0)} className="text-ink-2 underline hover:text-ink">
                Back
              </button>
            </div>
          </section>

          {/* Step: seal */}
          <section hidden={step !== 2} aria-labelledby="step-seal">
            <h1 id="step-seal" ref={step === 2 ? headingRef : undefined} tabIndex={-1} className="font-display text-display-l text-ink outline-none">
              Seal your place.
            </h1>
            <p className="mt-4 text-ink-2">We will send a letter to confirm the address. It never appears publicly.</p>
            <div className="mt-10 flex flex-col gap-6">
              <Field label="Email" htmlFor="email" error={errors.email}>
                <Input id="email" name="email" type="email" autoComplete="email" required aria-invalid={!!errors.email} />
              </Field>
              <Field label="Password" htmlFor="password" error={errors.password} hint="At least 10 characters, with a letter and a number.">
                <PasswordInput id="password" name="password" autoComplete="new-password" required aria-invalid={!!errors.password} />
              </Field>
              <Field
                label="Date of birth"
                htmlFor="date_of_birth"
                error={errors.date_of_birth}
                hint="Members must be 13 or older. Never shown to anyone."
              >
                <Input id="date_of_birth" name="date_of_birth" type="date" required max={new Date().toISOString().slice(0, 10)} aria-invalid={!!errors.date_of_birth} />
              </Field>
              <div>
                <Checkbox
                  name="terms"
                  label={
                    <>
                      I accept the{" "}
                      <Link href="/terms" target="_blank" className="text-ink underline">
                        terms
                      </Link>{" "}
                      and the{" "}
                      <Link href="/guidelines" target="_blank" className="text-ink underline">
                        community guidelines
                      </Link>
                      , and I have read the{" "}
                      <Link href="/privacy" target="_blank" className="text-ink underline">
                        privacy policy
                      </Link>
                      .
                    </>
                  }
                />
                {errors.terms && <p className="mt-2 text-micro text-danger">{errors.terms}</p>}
              </div>
              {step === 2 && <Turnstile action="signup" />}
              {state && !state.ok && <Notice tone={state.kind === "rate_limited" ? "warning" : "error"}>{state.message}</Notice>}
              <div className="flex flex-wrap items-center gap-4">
                <SubmitButton pendingLabel="Sealing…">Seal and send the letter</SubmitButton>
                <button type="button" onClick={() => setStep(1)} className="text-ink-2 underline hover:text-ink">
                  Back
                </button>
              </div>
            </div>
          </section>
        </form>
        <p className="mt-auto pt-16 text-small text-muted">
          Already a member?{" "}
          <Link href="/login" className="text-ink underline">
            Sign in
          </Link>
        </p>
      </div>
      <div className="relative hidden lg:block">
        <div className="sticky top-24">
          <Mark size="100%" decorative lit={plane} strokeWidth={1.4} className="text-ink-2" />
          <p className="mt-6 text-small text-muted">
            {step === 0 && "The first plane divides left from right: who you are."}
            {step === 1 && "The second divides front from back: what you face."}
            {step === 2 && "The third divides above from below: where you stand."}
          </p>
        </div>
      </div>
    </div>
  );
}
