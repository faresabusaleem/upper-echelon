import { ImageResponse } from "next/og";
import { createClient } from "@supabase/supabase-js";
import { publicEnv } from "@/lib/env";
import { OG_SIZE, OgFrame, ogEngraving, ogFonts } from "@/lib/og";
import { tierInfo } from "@/lib/tiers";

/** Open Graph image for a member profile: name, tier and score only. */
export async function GET(_: Request, { params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const supabase = createClient(publicEnv.NEXT_PUBLIC_SUPABASE_URL, publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false } });
  const { data } = await supabase.from("profiles").select("display_name, username, tier, echelon_score").eq("username", decodeURIComponent(username)).maybeSingle();
  const t = data ? tierInfo(data.tier) : null;
  return new ImageResponse(
    <OgFrame
      eyebrow={data ? `@${data.username}` : "Upper Echelon"}
      title={data?.display_name ?? "A member"}
      footer={t ? `${t.numeral} · ${t.name} · ${data!.echelon_score} of 1,000` : "A society for sharp minds"}
      engraving={await ogEngraving()}
    />,
    { ...OG_SIZE, fonts: await ogFonts(), headers: { "cache-control": "public, max-age=3600, s-maxage=3600" } },
  );
}
