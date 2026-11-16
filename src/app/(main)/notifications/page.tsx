import Link from "next/link";
import type { Metadata } from "next";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { describeNotification, type NotificationRow } from "@/lib/notifications";
import { Avatar } from "@/components/ui/avatar";
import { Empty } from "@/components/ui/empty";
import { Mark } from "@/components/brand/mark";
import { SubmitButton } from "@/components/ui/submit-button";
import { clearReadAction, markAllReadAction } from "./actions";
import { MarkReadOnView } from "./mark-read";
import { timeAgo } from "@/lib/utils";

export const metadata: Metadata = { title: "Notifications", robots: { index: false } };

export default async function NotificationsPage() {
  const viewer = await requireViewer({ next: "/notifications" });
  const supabase = await createClient();
  const { data } = await supabase
    .from("notifications")
    .select("*, actor:profiles!notifications_actor_id_fkey(username, display_name, avatar_url)")
    .eq("user_id", viewer.id)
    .order("created_at", { ascending: false })
    .limit(100);
  const rows = (data ?? []) as unknown as NotificationRow[];
  const unread = rows.filter((r) => !r.read_at).length;

  return (
    <div className="mx-auto w-full max-w-4xl px-[var(--gutter)] pb-10 pt-10 sm:pt-16">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <h1 className="font-display text-display-l text-ink">Notices</h1>
          <p className="mt-3 text-ink-2">
            {unread ? `${unread} new.` : "All read."}{" "}
            <Link href="/settings/notifications" className="text-ink underline">Choose what you receive</Link>
          </p>
        </div>
        <div className="flex gap-3">
          {unread > 0 && (
            <form action={markAllReadAction}><SubmitButton size="sm" variant="secondary">Mark all read</SubmitButton></form>
          )}
          {rows.length - unread > 0 && (
            <form action={clearReadAction}><SubmitButton size="sm" variant="quiet">Clear read</SubmitButton></form>
          )}
        </div>
      </div>
      {rows.length ? (
        <ul className="mt-10 flex flex-col">
          {rows.map((n) => {
            const d = describeNotification(n);
            return (
              <li key={n.id}>
                <Link href={d.href} className="grid grid-cols-[auto_1fr_auto] items-center gap-4 px-2 py-4 hover:bg-raised">
                  {n.actor ? (
                    <Avatar src={n.actor.avatar_url} name={n.actor.display_name} size={36} />
                  ) : (
                    <span className="inline-flex size-9 items-center justify-center bg-panel"><Mark size={22} decorative className="text-gold" strokeWidth={4} /></span>
                  )}
                  <span className={n.read_at ? "text-ink-2" : "text-ink"}>
                    {!n.read_at && <span className="mr-2 inline-block size-2 bg-gold align-middle" aria-label="new" />}
                    {d.text}
                  </span>
                  <span className="text-small text-muted">{timeAgo(n.created_at)}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <Empty className="mt-10" title="Nothing to report.">Replies, mentions, new followers, marks and promotions will appear here.</Empty>
      )}
      {unread > 0 && <MarkReadOnView />}
    </div>
  );
}
