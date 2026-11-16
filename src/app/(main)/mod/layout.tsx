import Link from "next/link";
import { requireModerator } from "@/lib/auth";
import { ModNav } from "@/components/mod/mod-nav";

export const metadata = { title: "Moderation", robots: { index: false } };

export default async function ModLayout({ children }: { children: React.ReactNode }) {
  const viewer = await requireModerator();
  return (
    <div className="mx-auto w-full max-w-[96rem] px-[var(--gutter)] pb-10 pt-10 sm:pt-14">
      <p className="text-small text-muted">
        Signed in as a {viewer.isAdmin ? "administrator" : "moderator"}. Every action is recorded in the{" "}
        <Link href="/mod/audit" className="text-ink underline">audit log</Link>.
      </p>
      <h1 className="mt-2 font-display text-display-l text-ink">Moderation</h1>
      <ModNav isAdmin={viewer.isAdmin} />
      <div className="mt-10">{children}</div>
    </div>
  );
}
