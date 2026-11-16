"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { siteUrl } from "@/lib/env";
import { verifyTurnstile } from "@/lib/turnstile";
import { clientIp, ipKey } from "@/lib/request";
import { fail, type ActionResult } from "@/lib/errors";
import { safeNext } from "@/lib/utils";
import {
  displayNameSchema,
  dobSchema,
  emailSchema,
  fieldErrors,
  interestsSchema,
  passwordSchema,
  usernameSchema,
} from "@/lib/validation";

export type FormState = ActionResult | null;

async function limitByIp(bucket: string, max: number, windowSeconds: number) {
  const admin = createAdminClient();
  const { data } = await admin.rpc("hit_rate_limit", {
    p_key: `${bucket}:${await ipKey()}`,
    p_max: max,
    p_window_seconds: windowSeconds,
  });
  return data !== false;
}

/** Live availability check used by the Initiation. */
export async function checkUsername(username: string): Promise<{ available: boolean; message?: string }> {
  const parsed = usernameSchema.safeParse(username);
  if (!parsed.success) return { available: false, message: parsed.error.issues[0].message };
  const supabase = await createClient();
  const { data } = await supabase.rpc("username_available", { p_username: parsed.data });
  return data ? { available: true } : { available: false, message: "That name is taken or reserved." };
}

const signUpSchema = z.object({
  username: usernameSchema,
  display_name: displayNameSchema,
  interests: interestsSchema,
  email: emailSchema,
  password: passwordSchema,
  date_of_birth: dobSchema,
  terms: z.literal("on", { error: "You must accept the terms and guidelines." }),
});

/** Step three of the Initiation: the seal. Creates the account and sends the confirmation letter. */
export async function signUpAction(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = signUpSchema.safeParse({
    username: formData.get("username"),
    display_name: formData.get("display_name"),
    interests: formData.getAll("interests"),
    email: formData.get("email"),
    password: formData.get("password"),
    date_of_birth: formData.get("date_of_birth"),
    terms: formData.get("terms") ?? undefined,
  });
  if (!parsed.success) {
    const errors = fieldErrors(parsed.error);
    return fail(errors.date_of_birth?.includes("13") ? "too_young" : "invalid", Object.values(errors)[0], errors);
  }
  if (!(await verifyTurnstile(String(formData.get("cf-turnstile-response") ?? ""), await clientIp()))) {
    return fail("forbidden", "The human check did not pass. Please try it again.");
  }
  if (!(await limitByIp("signup", 5, 3600))) {
    return fail("rate_limited", "Too many sign-ups from this connection. Try again in an hour.");
  }
  const available = await checkUsername(parsed.data.username);
  if (!available.available) return fail("conflict", available.message ?? "That name is taken.", { username: available.message ?? "" });

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${siteUrl}/auth/confirm?next=/initiation`,
      data: {
        username: parsed.data.username,
        display_name: parsed.data.display_name,
        interests: parsed.data.interests,
        date_of_birth: parsed.data.date_of_birth,
      },
    },
  });
  if (error) {
    if (error.code === "weak_password") return fail("invalid", "Choose a stronger password.", { password: error.message });
    if (error.message.toLowerCase().includes("13")) return fail("too_young", "Members must be at least 13 years old.");
    if (error.status === 429) return fail("rate_limited", "Too many attempts. Please wait a few minutes.");
    return fail("unknown", "We could not complete the sign-up. Please try again.");
  }
  // Supabase deliberately does not reveal whether the address was already registered.
  redirect("/join/sent");
}

const signInSchema = z.object({ email: emailSchema, password: z.string().min(1, "Enter your password.") });

export async function signInAction(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = signInSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return fail("invalid", "Enter your email and password.", fieldErrors(parsed.error));
  if (!(await limitByIp("signin", 20, 900))) return fail("rate_limited", "Too many attempts. Try again in a few minutes.");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    if (error.code === "email_not_confirmed") {
      return fail("forbidden", "Confirm your email address first. The letter may be in your spam folder.");
    }
    return fail("invalid", "That email and password do not match.");
  }
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  const next = safeNext(String(formData.get("next") ?? ""));
  if (aal && aal.nextLevel === "aal2" && aal.currentLevel !== "aal2") {
    redirect(`/login/mfa?next=${encodeURIComponent(next)}`);
  }
  redirect(next);
}

export async function magicLinkAction(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) return fail("invalid", "Enter a valid email address.", { email: "Enter a valid email address." });
  if (!(await verifyTurnstile(String(formData.get("cf-turnstile-response") ?? ""), await clientIp()))) {
    return fail("forbidden", "The human check did not pass. Please try it again.");
  }
  if (!(await limitByIp("magic", 5, 3600))) return fail("rate_limited", "Too many links requested. Try again later.");
  const supabase = await createClient();
  const next = safeNext(String(formData.get("next") ?? ""));
  // Existing members only: joining always goes through the Initiation (age check, guidelines).
  await supabase.auth.signInWithOtp({
    email: parsed.data,
    options: { shouldCreateUser: false, emailRedirectTo: `${siteUrl}/auth/confirm?next=${encodeURIComponent(next)}` },
  });
  return { ok: true, message: "If an account exists for that address, a sign-in link is on its way." };
}

export async function googleAction(formData: FormData) {
  const supabase = await createClient();
  const next = safeNext(String(formData.get("next") ?? ""), "/initiation");
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${siteUrl}/auth/callback?next=${encodeURIComponent(next)}` },
  });
  if (error || !data.url) redirect("/login?error=google");
  redirect(data.url);
}

export async function resetRequestAction(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) return fail("invalid", "Enter a valid email address.", { email: "Enter a valid email address." });
  if (!(await verifyTurnstile(String(formData.get("cf-turnstile-response") ?? ""), await clientIp()))) {
    return fail("forbidden", "The human check did not pass. Please try it again.");
  }
  if (!(await limitByIp("reset", 5, 3600))) return fail("rate_limited", "Too many requests. Try again later.");
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(parsed.data, {
    redirectTo: `${siteUrl}/auth/confirm?next=/reset-password/update`,
  });
  return { ok: true, message: "If an account exists for that address, a reset link is on its way." };
}

export async function updatePasswordAction(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = passwordSchema.safeParse(formData.get("password"));
  if (!parsed.success) return fail("invalid", parsed.error.issues[0].message, { password: parsed.error.issues[0].message });
  if (formData.get("password") !== formData.get("confirm")) {
    return fail("invalid", "The passwords do not match.", { confirm: "The passwords do not match." });
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data });
  if (error) {
    if (error.code === "same_password") return fail("invalid", "Choose a password you have not used here before.");
    return fail("unknown", "The link has expired. Request a new one.");
  }
  redirect("/home?password=updated");
}

export async function verifyMfaAction(_: FormState, formData: FormData): Promise<FormState> {
  const code = String(formData.get("code") ?? "").replace(/\s/g, "");
  if (!/^\d{6}$/.test(code)) return fail("invalid", "Enter the six-digit code from your authenticator.");
  if (!(await limitByIp("mfa", 10, 900))) return fail("rate_limited", "Too many attempts. Try again in a few minutes.");
  const supabase = await createClient();
  const { data: factors } = await supabase.auth.mfa.listFactors();
  const factor = factors?.totp.find((f) => f.status === "verified");
  if (!factor) redirect("/home");
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code });
  if (error) return fail("invalid", "That code is not valid. Codes change every 30 seconds.");
  redirect(safeNext(String(formData.get("next") ?? "")));
}

const initiationSchema = z.object({
  username: usernameSchema,
  display_name: displayNameSchema,
  interests: interestsSchema,
  date_of_birth: dobSchema.optional(),
});

/** Seals the Initiation: confirms name, interests and (for Google sign-ups) date of birth. */
export async function completeInitiationAction(input: {
  username: string;
  display_name: string;
  interests: string[];
  date_of_birth?: string;
}): Promise<ActionResult> {
  const parsed = initiationSchema.safeParse(input);
  if (!parsed.success) {
    const errors = fieldErrors(parsed.error);
    return fail(errors.date_of_birth?.includes("13") ? "too_young" : "invalid", Object.values(errors)[0], errors);
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("complete_initiation", {
    p_username: parsed.data.username,
    p_display_name: parsed.data.display_name,
    p_interests: parsed.data.interests,
    p_date_of_birth: parsed.data.date_of_birth ?? (null as unknown as string),
  });
  if (error) {
    if (error.code === "UE413") {
      // Under-age: remove the account and its data immediately.
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        await createAdminClient().auth.admin.deleteUser(data.user.id);
        await supabase.auth.signOut();
      }
      return fail("too_young", "Members must be at least 13 years old. Your details have been deleted.");
    }
    if (error.code === "UE409") return fail("conflict", "That name is taken or reserved.", { username: "That name is taken or reserved." });
    return fail("invalid", error.message || "We could not complete the Initiation.");
  }
  return { ok: true };
}
