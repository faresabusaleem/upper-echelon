import type { Metadata } from "next";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PeopleList, PrivacyForm } from "@/components/settings/simple-forms";

export const metadata: Metadata = { title: "Privacy" };

export default async function PrivacyPage() {
  const viewer = await requireViewer();
  const supabase = await createClient();
  const [{ data: blocks }, { data: mutes }] = await Promise.all([
    supabase.from("blocks").select("p:profiles!blocks_blocked_id_fkey(id, username, display_name, avatar_url)").eq("blocker_id", viewer.id),
    supabase.from("mutes").select("p:profiles!mutes_muted_id_fkey(id, username, display_name, avatar_url)").eq("muter_id", viewer.id),
  ]);
  const s = viewer.settings!;
  const people = (rows: Array<{ p: unknown }> | null) =>
    (rows ?? []).map((r) => r.p as { id: string; username: string; display_name: string; avatar_url: string | null }).filter(Boolean);
  return (
    <div className="flex flex-col gap-16">
      <section aria-labelledby="vis-h">
        <h2 id="vis-h" className="font-display text-display-s text-ink">Who sees what</h2>
        <div className="mt-6"><PrivacyForm values={s} /></div>
      </section>
      <section aria-labelledby="blocked-h">
        <h2 id="blocked-h" className="font-display text-display-s text-ink">Blocked</h2>
        <p className="mt-2 text-small text-muted">Blocked members cannot follow you, message you, or see your privacy-controlled sections. They are not told.</p>
        <div className="mt-4"><PeopleList people={people(blocks)} mode="blocked" /></div>
      </section>
      <section aria-labelledby="muted-h">
        <h2 id="muted-h" className="font-display text-display-s text-ink">Muted</h2>
        <p className="mt-2 text-small text-muted">You will not be notified about muted members. They can still see your public profile.</p>
        <div className="mt-4"><PeopleList people={people(mutes)} mode="muted" /></div>
      </section>
    </div>
  );
}
