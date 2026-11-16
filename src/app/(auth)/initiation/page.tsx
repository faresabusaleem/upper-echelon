import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { InitiationSequence } from "@/components/auth/initiation-sequence";

export const metadata: Metadata = { title: "The Initiation", robots: { index: false } };

export default async function InitiationPage({ searchParams }: PageProps<"/initiation">) {
  const viewer = await requireViewer({ allowUnonboarded: true, next: "/initiation" });
  const sp = await searchParams;
  if (viewer.profile.onboarded_at && sp.again !== "1") redirect("/home");
  const supabase = await createClient();
  const { data: priv } = await supabase.from("profile_private").select("date_of_birth").eq("user_id", viewer.id).maybeSingle();
  return (
    <InitiationSequence
      initial={{
        username: viewer.profile.username as string,
        displayName: viewer.profile.display_name,
        interests: viewer.profile.interests,
        needsName: (viewer.profile.username as string).startsWith("member_"),
        needsBirth: !priv?.date_of_birth,
        avatarUrl: viewer.profile.avatar_url,
        onboarded: !!viewer.profile.onboarded_at,
      }}
    />
  );
}
