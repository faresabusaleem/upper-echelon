"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { checkUsername, completeInitiationAction } from "@/app/(auth)/actions";
import { Mark } from "@/components/brand/mark";
import { ReactionGame } from "@/components/arena/games/reaction";
import { Button, ButtonLink } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { ImageCropper } from "@/components/ui/image-cropper";
import { Notice } from "@/components/ui/notice";
import { cn } from "@/lib/utils";
import { displayNameSchema, dobSchema, usernameSchema } from "@/lib/validation";
import { InterestPicker } from "./interest-picker";

type StepKey = "name" | "interests" | "birth" | "likeness" | "trial" | "welcome";

/**
 * The second half of the Initiation, after the address is confirmed (or after Google sign-in):
 * whatever is still missing (name, subjects, date of birth), then a likeness, an optional first
 * trial, and the welcome.
 */
export function InitiationSequence({
  initial,
}: {
  initial: {
    username: string;
    displayName: string;
    interests: string[];
    needsName: boolean;
    needsBirth: boolean;
    avatarUrl: string | null;
    onboarded: boolean;
  };
}) {
  const router = useRouter();
  const steps: StepKey[] = [
    ...(initial.needsName ? (["name", "interests"] as StepKey[]) : []),
    ...(initial.needsBirth ? (["birth"] as StepKey[]) : []),
    "likeness",
    "trial",
    "welcome",
  ];
  const [i, setI] = useState(0);
  const step = steps[i];
  const [username, setUsername] = useState(initial.needsName ? "" : initial.username);
  const [displayName, setDisplayName] = useState(initial.needsName ? "" : initial.displayName);
  const [interests, setInterests] = useState<string[]>(initial.interests);
  const [dob, setDob] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<Record<string, string>>({});
  const [sealed, setSealed] = useState(initial.onboarded);
  const [busy, setBusy] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => headingRef.current?.focus(), [i]);


  // Seal as soon as the required facts are known, so the first trial is saved to the record.
  const seal = async () => {
    setBusy(true);
    setError(null);
    const res = await completeInitiationAction({
      username,
      display_name: displayName || username,
      interests,
      date_of_birth: dob || undefined,
    });
    setBusy(false);
    if (!res.ok) {
      if (res.kind === "too_young") {
        router.replace("/?underage=1");
        return false;
      }
      setError(res.message);
      setFieldError(res.fieldErrors ?? {});
      if (res.fieldErrors?.username) setI(steps.indexOf("name"));
      return false;
    }
    setSealed(true);
    return true;
  };

  // Email sign-ups chose their name, subjects and date of birth before confirming: seal at once,
  // so the likeness upload and the first trial are saved to the record.
  const autoSealed = useRef(false);
  useEffect(() => {
    if (!sealed && steps[0] === "likeness" && !autoSealed.current) {
      autoSealed.current = true;
      void seal();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const advance = async () => {
    setError(null);
    if (step === "name") {
      const u = usernameSchema.safeParse(username);
      const d = displayNameSchema.safeParse(displayName || username);
      if (!u.success) return setFieldError({ username: u.error.issues[0].message });
      if (!d.success) return setFieldError({ display_name: d.error.issues[0].message });
      const avail = await checkUsername(username);
      if (!avail.available) return setFieldError({ username: avail.message ?? "That name is taken." });
      setFieldError({});
    }
    if (step === "birth") {
      const b = dobSchema.safeParse(dob);
      if (!b.success) return setFieldError({ date_of_birth: b.error.issues[0].message });
    }
    const nextStep = steps[i + 1];
    if (["likeness", "trial", "welcome"].includes(nextStep) && !sealed) {
      if (!(await seal())) return;
    }
    setI(i + 1);
  };

  return (
    <div className="mx-auto grid w-full max-w-6xl flex-1 gap-10 px-[var(--gutter)] pb-16 pt-6 lg:grid-cols-[1fr_minmax(0,20rem)] lg:gap-20 lg:pt-14">
      <div className="flex flex-col">
        {step !== "welcome" && (
          <ol aria-label="Steps of the Initiation" className="flex flex-wrap gap-x-6 gap-y-2 text-small">
            {steps.slice(0, -1).map((s, idx) => (
              <li key={s} aria-current={idx === i ? "step" : undefined} className={cn(idx === i ? "text-ink" : idx < i ? "text-ink-2" : "text-muted")}>
                <span className={cn("mr-2 inline-block size-1.5 align-middle", idx <= i ? "bg-gold" : "bg-panel-3")} aria-hidden />
                {{ name: "Name", interests: "Interests", birth: "Birth", likeness: "Likeness", trial: "First trial", welcome: "" }[s]}
              </li>
            ))}
          </ol>
        )}

        <div className="mt-12 flex max-w-2xl flex-col" key={step}>
          {step === "name" && (
            <section className="animate-rise">
              <h1 ref={headingRef} tabIndex={-1} className="font-display text-display-l text-ink outline-none">
                What shall we call you?
              </h1>
              <div className="mt-10 flex flex-col gap-6">
                <Field label="Username" htmlFor="u" error={fieldError.username} hint="3–20 letters, numbers or underscores.">
                  <Input id="u" value={username} onChange={(e) => setUsername(e.target.value.replace(/\s/g, ""))} autoCapitalize="off" />
                </Field>
                <Field label="Display name" htmlFor="d" error={fieldError.display_name}>
                  <Input id="d" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder={username} />
                </Field>
              </div>
            </section>
          )}
          {step === "interests" && (
            <section className="animate-rise">
              <h1 ref={headingRef} tabIndex={-1} className="font-display text-display-l text-ink outline-none">
                What do you think about?
              </h1>
              <div className="mt-10">
                <InterestPicker value={interests} onChange={setInterests} />
              </div>
            </section>
          )}
          {step === "birth" && (
            <section className="animate-rise">
              <h1 ref={headingRef} tabIndex={-1} className="font-display text-display-l text-ink outline-none">
                When were you born?
              </h1>
              <p className="mt-4 text-ink-2">Members must be 13 or older. Your date of birth is never shown to anyone.</p>
              <div className="mt-10 max-w-xs">
                <Field label="Date of birth" htmlFor="dob" error={fieldError.date_of_birth}>
                  <Input id="dob" type="date" value={dob} onChange={(e) => setDob(e.target.value)} max={new Date().toISOString().slice(0, 10)} />
                </Field>
              </div>
            </section>
          )}
          {step === "likeness" && (
            <section className="animate-rise">
              <h1 ref={headingRef} tabIndex={-1} className="font-display text-display-l text-ink outline-none">
                Your likeness.
              </h1>
              <p className="mt-4 text-ink-2">A portrait, a symbol, anything that is yours. You may also leave it blank.</p>
              <div className="mt-10">
                <ImageCropper kind="avatar" current={initial.avatarUrl} />
              </div>
            </section>
          )}
          {step === "trial" && (
            <section className="animate-rise">
              <h1 ref={headingRef} tabIndex={-1} className="font-display text-display-l text-ink outline-none">
                A first trial, if you wish.
              </h1>
              <p className="mt-4 text-ink-2">Reaction time: five attempts. It becomes the first entry in your record.</p>
              <div className="mt-8">
                <ReactionGame isMember compact />
              </div>
            </section>
          )}
          {step === "welcome" && (
            <section className="animate-rise">
              <Mark size={72} decorative className="text-gold" strokeWidth={2.4} />
              <h1 ref={headingRef} tabIndex={-1} className="mt-10 font-display text-display-xl text-ink outline-none">
                Welcome to the Echelon.
              </h1>
              <p className="mt-6 max-w-[44ch] text-lede text-ink-2">
                You are an Initiate. Play, practise and contribute, and the ladder will notice.
              </p>
              <div className="mt-10 flex flex-wrap gap-4">
                <ButtonLink href="/home" size="lg">
                  Enter
                </ButtonLink>
                <ButtonLink href="/forum/c/introductions" variant="secondary" size="lg">
                  Introduce yourself
                </ButtonLink>
              </div>
            </section>
          )}

          {error && <Notice tone="error" className="mt-8">{error}</Notice>}

          {step !== "welcome" && (
            <div className="mt-12 flex flex-wrap items-center gap-5">
              <Button onClick={advance} disabled={busy}>
                {busy ? "One moment…" : step === "trial" ? "Finish" : step === "likeness" ? "Continue" : "Continue"}
              </Button>
              {(step === "likeness" || step === "trial") && (
                <button type="button" onClick={() => setI(i + 1)} className="text-ink-2 underline hover:text-ink">
                  Skip
                </button>
              )}
              {i > 0 && !["likeness", "trial"].includes(step) && (
                <button type="button" onClick={() => setI(i - 1)} className="text-ink-2 underline hover:text-ink">
                  Back
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="relative hidden lg:block">
        <div className="sticky top-24">
          <Mark
            size="100%"
            decorative
            strokeWidth={1.4}
            className={step === "welcome" ? "text-gold" : "text-ink-2"}
            lit={step === "name" ? "sagittal" : step === "interests" ? "coronal" : step === "welcome" ? null : "transverse"}
          />
        </div>
      </div>
      {step === "welcome" && (
        <p className="text-small text-muted lg:col-span-2">
          Read the{" "}
          <Link href="/guidelines" className="text-ink underline">
            community guidelines
          </Link>{" "}
          before you post.
        </p>
      )}
    </div>
  );
}
