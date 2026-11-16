import type { Metadata } from "next";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SignOutOthers, TwoFactor } from "@/components/settings/two-factor";

export const metadata: Metadata = { title: "Security" };

export default async function SecurityPage() {
  await requireViewer();
  const supabase = await createClient();
  const { data } = await supabase.auth.mfa.listFactors();
  const verified = data?.totp.find((f) => f.status === "verified") ?? null;
  return (
    <div className="flex flex-col gap-16">
      <section aria-labelledby="mfa-h">
        <h2 id="mfa-h" className="font-display text-display-s text-ink">Two-factor authentication</h2>
        <div className="mt-6"><TwoFactor verifiedFactorId={verified?.id ?? null} /></div>
      </section>
      <section aria-labelledby="sessions-h">
        <h2 id="sessions-h" className="font-display text-display-s text-ink">Sessions</h2>
        <div className="mt-6"><SignOutOthers /></div>
      </section>
    </div>
  );
}
