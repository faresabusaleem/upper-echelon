import { requireAdmin } from "@/lib/auth";
import { ModNav } from "@/components/mod/mod-nav";

export const metadata = { title: "Administration", robots: { index: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="mx-auto w-full max-w-[96rem] px-[var(--gutter)] pb-10 pt-10 sm:pt-14">
      <h1 className="font-display text-display-l text-ink">Administration</h1>
      <ModNav isAdmin />
      <div className="mt-10">{children}</div>
    </div>
  );
}
