"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { siteUrl } from "@/lib/env";
import { fail, toActionError, type ActionResult } from "@/lib/errors";
import { GAME_KINDS } from "@/lib/games/catalog";
import { displayNameSchema, emailSchema, fieldErrors, interestsSchema, passwordSchema, usernameSchema } from "@/lib/validation";

export type SettingsState = ActionResult | null;

async function me() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login?next=/settings");
  return viewer;
}

const linkSchema = z.object({
  label: z.string().trim().max(40).optional().default(""),
  url: z
    .string()
    .trim()
    .max(300)
    .regex(/^https?:\/\/[^\s]+$/, "Links must start with http:// or https://"),
});

const profileSchema = z.object({
  username: usernameSchema,
  display_name: displayNameSchema,
  bio: z.string().max(500, "At most 500 characters.").optional().default(""),
  location: z.string().trim().max(60).optional().default(""),
  pronouns: z.string().trim().max(30).optional().default(""),
  interests: interestsSchema,
  links: z.array(linkSchema).max(5),
  theme: z.enum(["pewter", "bronze", "silver", "gold", "platinum", "obsidian"]),
  showcase_badges: z.array(z.string().max(40)).max(6),
  showcase_games: z.array(z.enum(GAME_KINDS)).max(4),
});

export async function saveProfileAction(_: SettingsState, formData: FormData): Promise<SettingsState> {
  const viewer = await me();
  const labels = formData.getAll("link_label").map(String);
  const urls = formData.getAll("link_url").map(String);
  const parsed = profileSchema.safeParse({
    username: formData.get("username"),
    display_name: formData.get("display_name"),
    bio: formData.get("bio") ?? "",
    location: formData.get("location") ?? "",
    pronouns: formData.get("pronouns") ?? "",
    interests: formData.getAll("interests"),
    links: urls.map((url, i) => ({ url, label: labels[i] ?? "" })).filter((l) => l.url.trim()),
    theme: formData.get("theme"),
    showcase_badges: formData.getAll("showcase_badges"),
    showcase_games: formData.getAll("showcase_games"),
  });
  if (!parsed.success) {
    const errors = fieldErrors(parsed.error);
    return fail("invalid", Object.values(errors)[0], errors);
  }
  const supabase = await createClient();
  const d = parsed.data;
  const { error } = await supabase
    .from("profiles")
    .update({
      username: d.username,
      display_name: d.display_name,
      bio: d.bio.trim() || null,
      location: d.location || null,
      pronouns: d.pronouns || null,
      interests: d.interests,
      links: d.links,
      theme: d.theme,
      showcase_badges: d.showcase_badges,
      showcase_games: d.showcase_games,
    })
    .eq("id", viewer.id);
  if (error) {
    const e = toActionError(error);
    if (error.code === "UE409" || error.code === "23505") return { ...e, fieldErrors: { username: "That name is taken or reserved." } };
    return e;
  }
  revalidatePath("/", "layout");
  return { ok: true, message: "Profile saved." };
}

export async function removeImageAction(kind: "avatar" | "banner"): Promise<ActionResult> {
  const viewer = await me();
  const admin = createAdminClient();
  const url = kind === "avatar" ? viewer.profile.avatar_url : viewer.profile.banner_url;
  const bucket = kind === "avatar" ? "avatars" : "banners";
  const marker = `/storage/v1/object/public/${bucket}/`;
  if (url?.includes(marker)) {
    const path = url.split(marker)[1];
    if (path?.startsWith(`${viewer.id}/`)) {
      await admin.storage.from(bucket).remove([path]);
      await admin.from("uploads").delete().eq("path", `${bucket}/${path}`);
    }
  }
  await admin.from("profiles").update(kind === "avatar" ? { avatar_url: null } : { banner_url: null }).eq("id", viewer.id);
  revalidatePath("/", "layout");
  return { ok: true };
}

const visibility = z.enum(["everyone", "followers", "only_me"]);
const privacySchema = z.object({
  game_stats_visibility: visibility,
  test_results_visibility: visibility,
  activity_visibility: visibility,
  followers_visibility: visibility,
  dm_policy: z.enum(["everyone", "following", "no_one"]),
  // A checkbox: present ("on") when ticked, absent when not.
  show_online: z.preprocess((v) => v === "on", z.boolean()),
});

export async function savePrivacyAction(_: SettingsState, formData: FormData): Promise<SettingsState> {
  const viewer = await me();
  const parsed = privacySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail("invalid", "Choose a value for every setting.");
  const supabase = await createClient();
  const { error } = await supabase.from("user_settings").update(parsed.data).eq("user_id", viewer.id);
  if (error) return toActionError(error);
  revalidatePath("/settings/privacy");
  return { ok: true, message: "Privacy settings saved." };
}

const KINDS = ["reply", "mention", "follow", "tier", "achievement", "solution", "message", "moderation"] as const;

export async function saveNotificationsAction(_: SettingsState, formData: FormData): Promise<SettingsState> {
  const viewer = await me();
  const inapp: Record<string, boolean> = {};
  const email: Record<string, boolean> = {};
  for (const k of KINDS) {
    if (k !== "message" && k !== "moderation") inapp[k] = formData.get(`inapp_${k}`) === "on";
    email[k] = formData.get(`email_${k}`) === "on";
  }
  const supabase = await createClient();
  const { error } = await supabase.from("user_settings").update({ notify_inapp: inapp, notify_email: email }).eq("user_id", viewer.id);
  if (error) return toActionError(error);
  revalidatePath("/settings/notifications");
  return { ok: true, message: "Notification preferences saved." };
}

export async function saveAppearanceAction(_: SettingsState, formData: FormData): Promise<SettingsState> {
  const viewer = await me();
  const supabase = await createClient();
  const { error } = await supabase
    .from("user_settings")
    .update({
      reduced_motion: formData.get("reduced_motion") === "on",
      grain: formData.get("grain") === "on",
      high_contrast: formData.get("high_contrast") === "on",
    })
    .eq("user_id", viewer.id);
  if (error) return toActionError(error);
  revalidatePath("/", "layout");
  return { ok: true, message: "Appearance saved." };
}

export async function changeEmailAction(_: SettingsState, formData: FormData): Promise<SettingsState> {
  await me();
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) return fail("invalid", "Enter a valid email address.", { email: "Enter a valid email address." });
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser(
    { email: parsed.data },
    { emailRedirectTo: `${siteUrl}/auth/confirm?next=/settings/account` },
  );
  if (error) return fail("invalid", error.status === 429 ? "Too many requests. Try again later." : "That address could not be used.");
  return { ok: true, message: "Confirm the change from both your old and new inboxes." };
}

export async function changePasswordAction(_: SettingsState, formData: FormData): Promise<SettingsState> {
  await me();
  const parsed = passwordSchema.safeParse(formData.get("password"));
  if (!parsed.success) return fail("invalid", parsed.error.issues[0].message, { password: parsed.error.issues[0].message });
  if (formData.get("password") !== formData.get("confirm")) {
    return fail("invalid", "The passwords do not match.", { confirm: "The passwords do not match." });
  }
  const supabase = await createClient();
  const nonce = String(formData.get("nonce") ?? "").trim() || undefined;
  const { error } = await supabase.auth.updateUser({ password: parsed.data, nonce });
  if (error) {
    if (error.code === "reauthentication_needed" || error.code === "reauthentication_not_valid") {
      await supabase.auth.reauthenticate();
      return fail("forbidden", "For your safety, we emailed you a code. Enter it below with your new password.", {
        nonce: "Enter the code from the email.",
      });
    }
    if (error.code === "same_password") return fail("invalid", "Choose a password you have not used here before.");
    return fail("unknown", "The password could not be changed.");
  }
  return { ok: true, message: "Password changed." };
}

export async function signOutOthersAction(): Promise<ActionResult> {
  await me();
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "others" });
  return { ok: true, message: "Signed out of every other device." };
}

export async function unlinkIdentityAction(provider: string): Promise<ActionResult> {
  await me();
  const supabase = await createClient();
  const { data } = await supabase.auth.getUserIdentities();
  const identities = data?.identities ?? [];
  if (identities.length < 2) return fail("forbidden", "You need at least one way to sign in.");
  const identity = identities.find((i) => i.provider === provider);
  if (!identity) return fail("not_found", "That sign-in method is not connected.");
  const { error } = await supabase.auth.unlinkIdentity(identity);
  if (error) return fail("unknown", "It could not be disconnected.");
  revalidatePath("/settings/account");
  return { ok: true, message: "Disconnected." };
}

export async function linkGoogleAction() {
  await me();
  const supabase = await createClient();
  const { data, error } = await supabase.auth.linkIdentity({
    provider: "google",
    options: { redirectTo: `${siteUrl}/auth/callback?next=/settings/account` },
  });
  if (error || !data.url) redirect("/settings/account?error=link");
  redirect(data.url);
}

/**
 * Permanently deletes the account: personal content, images and the auth user. Threads that hold
 * other members' replies keep their title but lose their author and opening post.
 */
export async function deleteAccountAction(_: SettingsState, formData: FormData): Promise<SettingsState> {
  const viewer = await me();
  const confirm = String(formData.get("confirm") ?? "");
  if (confirm !== viewer.profile.username) {
    return fail("invalid", "Type your username exactly to confirm.", { confirm: "Type your username exactly." });
  }
  const supabase = await createClient();
  if (viewer.identities.includes("email")) {
    const password = String(formData.get("password") ?? "");
    const { error } = await supabase.auth.signInWithPassword({ email: viewer.email ?? "", password });
    if (error) return fail("forbidden", "That password is not correct.", { password: "That password is not correct." });
  }
  const admin = createAdminClient();
  for (const bucket of ["avatars", "banners", "forum", "proofs"]) {
    const { data: files } = await admin.storage.from(bucket).list(viewer.id, { limit: 1000 });
    if (files?.length) await admin.storage.from(bucket).remove(files.map((f) => `${viewer.id}/${f.name}`));
  }
  const { error: prepError } = await admin.rpc("prepare_account_deletion", { uid: viewer.id });
  if (prepError) return fail("unknown", "Deletion could not be completed. Nothing was removed. Try again or contact us.");
  const { error } = await admin.auth.admin.deleteUser(viewer.id);
  if (error) return fail("unknown", "Deletion could not be completed. Try again or contact us.");
  await supabase.auth.signOut();
  redirect("/?deleted=1");
}

export async function setTwoFactorAction(_: SettingsState, formData: FormData): Promise<SettingsState> {
  await me();
  const supabase = await createClient();
  const intent = formData.get("intent");
  if (intent === "verify") {
    const factorId = String(formData.get("factorId") ?? "");
    const code = String(formData.get("code") ?? "").replace(/\s/g, "");
    if (!/^\d{6}$/.test(code)) return fail("invalid", "Enter the six-digit code.");
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
    if (error) return fail("invalid", "That code did not match. Try the current one.");
    revalidatePath("/settings/security");
    return { ok: true, message: "Two-factor authentication is on." };
  }
  if (intent === "disable") {
    const factorId = String(formData.get("factorId") ?? "");
    const { error } = await supabase.auth.mfa.unenroll({ factorId });
    if (error) return fail("forbidden", "Sign in again with your code before turning two-factor off.");
    revalidatePath("/settings/security");
    return { ok: true, message: "Two-factor authentication is off." };
  }
  return fail("invalid", "Unknown request.");
}

export async function enrollTwoFactorAction(): Promise<ActionResult<{ factorId: string; qr: string; secret: string }>> {
  await me();
  const supabase = await createClient();
  // Remove abandoned, unverified factors first.
  const { data: list } = await supabase.auth.mfa.listFactors();
  for (const f of list?.all ?? []) if (f.status !== "verified") await supabase.auth.mfa.unenroll({ factorId: f.id });
  const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: `Authenticator ${Date.now()}` });
  if (error || !data) return fail("unknown", "Two-factor setup could not start.");
  return { ok: true, data: { factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret } };
}
