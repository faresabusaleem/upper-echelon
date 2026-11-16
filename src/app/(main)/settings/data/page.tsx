import type { Metadata } from "next";
import { requireViewer } from "@/lib/auth";
import { buttonClass } from "@/components/ui/button";
import { DeleteAccount } from "@/components/settings/delete-account";

export const metadata: Metadata = { title: "Your data" };

export default async function DataPage() {
  const viewer = await requireViewer();
  return (
    <div className="flex flex-col gap-16">
      <section aria-labelledby="export-h">
        <h2 id="export-h" className="font-display text-display-s text-ink">Download your data</h2>
        <p className="mt-3 max-w-[60ch] text-ink-2">
          A single JSON file with everything held about you: profile, settings, results, logged tests, threads, replies,
          votes, bookmarks, follows, messages in your conversations, notifications, reports you made and sanctions.
        </p>
        <a href="/api/account/export" className={buttonClass("secondary", "md", "mt-6")} download>
          Download my data
        </a>
      </section>
      <section aria-labelledby="delete-h">
        <h2 id="delete-h" className="font-display text-display-s text-danger">Delete your account</h2>
        <div className="mt-4">
          <DeleteAccount username={viewer.profile.username as string} hasPassword={viewer.identities.includes("email")} />
        </div>
      </section>
    </div>
  );
}
