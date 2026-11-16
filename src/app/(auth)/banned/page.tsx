import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireViewer } from "@/lib/auth";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Account suspended", robots: { index: false } };

export default async function BannedPage() {
  const viewer = await requireViewer({ allowBanned: true, allowUnonboarded: true });
  if (!viewer.ban) redirect("/home");
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-[var(--gutter)] py-20">
      <h1 className="font-display text-display-l text-ink">Your account is suspended.</h1>
      <p className="mt-6 text-lede text-ink-2">
        {viewer.ban.expires_at ? `The suspension ends on ${formatDate(viewer.ban.expires_at)}.` : "This suspension is permanent."}
      </p>
      <p className="mt-4 bg-raised px-5 py-4 text-ink-2">Reason given: {viewer.ban.reason}</p>
      <p className="mt-6 text-ink-2">
        You can still <Link href="/settings/data" className="text-ink underline">download or delete your data</Link>. If you
        believe this is a mistake, see the <Link href="/contact" className="text-ink underline">contact page</Link>.
      </p>
      <form action="/auth/signout" method="post" className="mt-10">
        <button className="text-ink underline">Sign out</button>
      </form>
    </div>
  );
}
