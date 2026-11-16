import type { Metadata } from "next";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { isGameKind } from "@/lib/games/catalog";
import { ProfileSettings } from "@/components/settings/profile-form";

export const metadata: Metadata = { title: "Profile settings" };

export default async function ProfileSettingsPage() {
  const viewer = await requireViewer();
  const supabase = await createClient();
  const [{ data: earned }, { data: bests }] = await Promise.all([
    supabase.from("member_achievements").select("code, achievement:achievements(name)").eq("user_id", viewer.id),
    supabase.from("game_bests").select("game").eq("user_id", viewer.id),
  ]);
  const p = viewer.profile;
  return (
    <ProfileSettings
      profile={{
        username: p.username as string,
        display_name: p.display_name,
        bio: p.bio,
        location: p.location,
        pronouns: p.pronouns,
        interests: p.interests,
        links: (Array.isArray(p.links) ? p.links : []) as Array<{ label?: string; url?: string }>,
        theme: p.theme,
        tier: p.tier,
        showcase_badges: p.showcase_badges,
        showcase_games: p.showcase_games,
        avatar_url: p.avatar_url,
        banner_url: p.banner_url,
      }}
      earned={(earned ?? []).map((e) => ({ code: e.code, name: e.achievement?.name ?? e.code }))}
      playedGames={(bests ?? []).map((b) => b.game).filter(isGameKind)}
    />
  );
}
