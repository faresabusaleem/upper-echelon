import { ImageResponse } from "next/og";
import { createClient } from "@supabase/supabase-js";
import { publicEnv } from "@/lib/env";
import { OG_SIZE, OgFrame, ogEngraving, ogFonts } from "@/lib/og";

/** Open Graph image for a forum thread (public data only, read anonymously). */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createClient(publicEnv.NEXT_PUBLIC_SUPABASE_URL, publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false } });
  const { data } = await supabase.from("thread_list").select("title, category_name, author_name, reply_count, removed_at").eq("id", Number(id)).maybeSingle();
  const ok = !!data && !data.removed_at;
  return new ImageResponse(
    <OgFrame
      eyebrow={ok ? `The Forum · ${data!.category_name}` : "The Forum"}
      title={ok ? data!.title : "Upper Echelon"}
      footer={ok ? `${data!.author_name ?? "A former member"} · ${data!.reply_count} ${data!.reply_count === 1 ? "reply" : "replies"}` : "A society for sharp minds"}
      engraving={await ogEngraving()}
    />,
    { ...OG_SIZE, fonts: await ogFonts(), headers: { "cache-control": "public, max-age=3600, s-maxage=3600" } },
  );
}
