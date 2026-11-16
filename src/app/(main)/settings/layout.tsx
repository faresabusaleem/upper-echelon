import { requireViewer } from "@/lib/auth";
import { SettingsNav } from "@/components/settings/settings-nav";

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  await requireViewer({ next: "/settings", allowBanned: true });
  return (
    <div className="mx-auto grid w-full max-w-[96rem] gap-10 px-[var(--gutter)] pb-10 pt-10 sm:pt-16 lg:grid-cols-[14rem_1fr] lg:gap-16">
      <div>
        <h1 className="font-display text-display-m text-ink">Settings</h1>
        <SettingsNav />
      </div>
      <div className="min-w-0 max-w-3xl">{children}</div>
    </div>
  );
}
