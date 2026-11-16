import type { Metadata } from "next";
import { requireViewer } from "@/lib/auth";
import { AppearanceForm } from "@/components/settings/simple-forms";

export const metadata: Metadata = { title: "Appearance" };

export default async function AppearancePage() {
  const viewer = await requireViewer();
  const s = viewer.settings!;
  return (
    <section aria-labelledby="a-h">
      <h2 id="a-h" className="font-display text-display-s text-ink">Appearance</h2>
      <div className="mt-6">
        <AppearanceForm values={{ reduced_motion: s.reduced_motion, grain: s.grain, high_contrast: s.high_contrast }} />
      </div>
    </section>
  );
}
