import Link from "next/link";
import type { Metadata } from "next";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Avatar } from "@/components/ui/avatar";
import { Empty } from "@/components/ui/empty";
import { timeAgo } from "@/lib/utils";

export const metadata: Metadata = { title: "Messages", robots: { index: false } };

export default async function MessagesPage() {
  const viewer = await requireViewer({ next: "/messages" });
  const supabase = await createClient();
  const { data: convs } = await supabase
    .from("conversations")
    .select(
      "id, user_a, user_b, last_message_at, a:profiles!conversations_user_a_fkey(username, display_name, avatar_url), b:profiles!conversations_user_b_fkey(username, display_name, avatar_url), conversation_state(user_id, last_read_at, cleared_at)",
    )
    .order("last_message_at", { ascending: false })
    .limit(100);

  const rows = await Promise.all(
    (convs ?? []).map(async (c) => {
      const mine = c.conversation_state.find((s) => s.user_id === viewer.id);
      if (mine?.cleared_at && new Date(c.last_message_at) <= new Date(mine.cleared_at)) return null;
      const other = c.user_a === viewer.id ? c.b : c.a;
      const { data: last } = await supabase
        .from("messages")
        .select("body, sender_id, created_at")
        .eq("conversation_id", c.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const unread = !!last && last.sender_id !== viewer.id && (!mine || new Date(last.created_at) > new Date(mine.last_read_at));
      return { id: c.id, other, last, unread };
    }),
  );
  const list = rows.filter(Boolean) as NonNullable<(typeof rows)[number]>[];

  return (
    <div className="mx-auto w-full max-w-4xl px-[var(--gutter)] pb-10 pt-10 sm:pt-16">
      <h1 className="font-display text-display-l text-ink">Messages</h1>
      <p className="mt-3 text-ink-2">
        Private conversations. Start one from a member’s profile.{" "}
        <Link href="/settings/privacy" className="text-ink underline">Who can message you</Link>
      </p>
      {list.length ? (
        <ul className="mt-10 flex flex-col">
          {list.map((c) => (
            <li key={c.id}>
              <Link href={`/messages/${c.id}`} className="grid grid-cols-[auto_1fr_auto] items-center gap-4 px-2 py-4 hover:bg-raised">
                <Avatar src={c.other?.avatar_url} name={c.other?.display_name ?? "?"} size={44} />
                <span className="min-w-0">
                  <span className={`block truncate ${c.unread ? "text-ink" : "text-ink-2"}`}>
                    {c.other?.display_name ?? "A former member"}
                    {c.unread && <span className="ml-2 inline-block size-2 bg-gold align-middle" aria-label="unread" />}
                  </span>
                  <span className="block truncate text-small text-muted">
                    {c.last ? `${c.last.sender_id === viewer.id ? "You: " : ""}${c.last.body}` : "No messages yet"}
                  </span>
                </span>
                <span className="text-small text-muted">{c.last ? timeAgo(c.last.created_at) : ""}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <Empty className="mt-10" title="No conversations.">
          Visit a member’s profile and choose Message. Members decide who may write to them; by default, only people they follow.
        </Empty>
      )}
    </div>
  );
}
