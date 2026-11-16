import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";
import { publicEnv, siteUrl } from "@/lib/env";
import { GAME_LIST } from "@/lib/games/catalog";
import { slugify } from "@/lib/utils";

export const revalidate = 3600;

/** Public pages, the Arena, the Directory and public forum threads. Member profiles are not listed. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const fixed = ["", "/about", "/arena", "/leaderboards", "/directory", "/forum", "/guidelines", "/privacy", "/terms", "/cookies", "/contact", "/join"].map(
    (p) => ({ url: `${siteUrl}${p}`, lastModified: now }),
  );
  const games = GAME_LIST.map((g) => ({ url: `${siteUrl}/arena/${g.slug}`, lastModified: now }));
  try {
    const supabase = createClient(publicEnv.NEXT_PUBLIC_SUPABASE_URL, publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false } });
    const [{ data: tests }, { data: threads }, { data: cats }] = await Promise.all([
      supabase.from("directory_tests").select("slug, updated_at").eq("is_published", true),
      supabase.from("thread_list").select("id, title, last_activity_at").is("removed_at", null).order("last_activity_at", { ascending: false }).limit(5000),
      supabase.from("forum_categories").select("slug"),
    ]);
    return [
      ...fixed,
      ...games,
      ...(tests ?? []).map((t) => ({ url: `${siteUrl}/directory/${t.slug}`, lastModified: new Date(t.updated_at) })),
      ...(cats ?? []).map((c) => ({ url: `${siteUrl}/forum/c/${c.slug}`, lastModified: now })),
      ...(threads ?? []).map((t) => ({ url: `${siteUrl}/forum/t/${t.id}/${slugify(t.title)}`, lastModified: new Date(t.last_activity_at) })),
    ];
  } catch {
    return [...fixed, ...games];
  }
}
