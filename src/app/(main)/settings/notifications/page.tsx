import type { Metadata } from "next";
import { requireViewer } from "@/lib/auth";
import { NotificationsForm } from "@/components/settings/simple-forms";

export const metadata: Metadata = { title: "Notification settings" };

export default async function NotificationSettingsPage() {
  const viewer = await requireViewer();
  const s = viewer.settings!;
  return (
    <section aria-labelledby="n-h">
      <h2 id="n-h" className="font-display text-display-s text-ink">Notifications</h2>
      <div className="mt-6">
        <NotificationsForm inapp={s.notify_inapp as Record<string, boolean>} email={s.notify_email as Record<string, boolean>} />
      </div>
    </section>
  );
}
