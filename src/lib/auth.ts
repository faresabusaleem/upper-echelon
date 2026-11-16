import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/database.types";

export type Profile = Tables<"profiles">;
export type Settings = Tables<"user_settings">;
export type Sanction = Tables<"sanctions">;

export type Viewer = {
  id: string;
  email: string | null;
  profile: Profile;
  settings: Settings | null;
  ban: Sanction | null;
  mute: Sanction | null;
  needsMfa: boolean;
  isModerator: boolean;
  isAdmin: boolean;
  identities: string[];
};

function active(s: Sanction) {
  return !s.revoked_at && (!s.expires_at || new Date(s.expires_at).getTime() > Date.now());
}

/**
 * The current member, verified with the Auth server, or null. Cached for the duration of a
 * request so layouts and pages can call it freely.
 */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [profileRes, settingsRes, sanctionsRes, aalRes] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase.from("user_settings").select("*").eq("user_id", user.id).maybeSingle(),
    supabase.from("sanctions").select("*").eq("user_id", user.id).is("revoked_at", null),
    supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
  ]);
  const profile = profileRes.data;
  if (!profile) return null;

  const sanctions = (sanctionsRes.data ?? []).filter(active);
  const aal = aalRes.data;
  return {
    id: user.id,
    email: user.email ?? null,
    profile,
    settings: settingsRes.data ?? null,
    ban: sanctions.find((s) => s.kind === "ban") ?? null,
    mute: sanctions.find((s) => s.kind === "mute") ?? null,
    needsMfa: !!aal && aal.nextLevel === "aal2" && aal.currentLevel !== "aal2",
    isModerator: profile.role === "moderator" || profile.role === "admin",
    isAdmin: profile.role === "admin",
    identities: (user.identities ?? []).map((i) => i.provider),
  };
});

type RequireOptions = {
  /** Allow members who have not finished the Initiation (the Initiation itself). */
  allowUnonboarded?: boolean;
  /** Allow banned members (the /banned page). */
  allowBanned?: boolean;
  next?: string;
};

/** Redirects unless a fully-authenticated, onboarded, unbanned member is present. */
export async function requireViewer(options: RequireOptions = {}): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) redirect(`/login${options.next ? `?next=${encodeURIComponent(options.next)}` : ""}`);
  if (viewer.needsMfa) redirect("/login/mfa");
  if (viewer.ban && !options.allowBanned) redirect("/banned");
  if (!viewer.profile.onboarded_at && !options.allowUnonboarded) redirect("/initiation");
  return viewer;
}

export async function requireModerator(): Promise<Viewer> {
  const viewer = await requireViewer();
  if (!viewer.isModerator) redirect("/home");
  return viewer;
}

export async function requireAdmin(): Promise<Viewer> {
  const viewer = await requireViewer();
  if (!viewer.isAdmin) redirect("/home");
  return viewer;
}
