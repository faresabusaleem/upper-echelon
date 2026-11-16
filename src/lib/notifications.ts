import type { Tables } from "@/lib/supabase/database.types";

export type NotificationRow = Tables<"notifications"> & {
  actor: { username: string; display_name: string; avatar_url: string | null } | null;
};

/** One line describing a notification, and where it leads. */
export function describeNotification(n: NotificationRow): { text: string; href: string } {
  const who = n.actor?.display_name ?? "Someone";
  const data = (n.data ?? {}) as Record<string, unknown>;
  const title = typeof data.title === "string" ? `“${data.title}”` : "a thread";
  const thread = n.thread_id ? `/forum/t/${n.thread_id}${n.post_id ? `#r${n.post_id}` : ""}` : "/forum";
  switch (n.kind) {
    case "reply":
      return { text: `${who} replied in ${title}.`, href: thread };
    case "mention":
      return { text: `${who} mentioned you in ${title}.`, href: thread };
    case "follow":
      return { text: `${who} now follows you.`, href: n.actor ? `/u/${n.actor.username}` : "/notifications" };
    case "solution":
      return { text: `Your reply in ${title} was marked as the solution.`, href: thread };
    case "tier":
      return { text: `You have risen to ${String(data.name ?? "a new tier")}.`, href: "/home" };
    case "achievement":
      return { text: `Achievement earned: ${String(data.name ?? "")}.`, href: "/home#achievements" };
    case "moderation": {
      const action = String(data.action ?? "note");
      const reason = data.reason ? ` Reason: ${String(data.reason)}` : "";
      const map: Record<string, string> = {
        removed: `A moderator removed your ${String(data.target ?? "content")}.`,
        warning: "You received a warning from the moderators.",
        mute: "You have been muted by the moderators.",
        ban: "Your account has been suspended.",
      };
      return { text: `${map[action] ?? "A note from the moderators."}${reason}`, href: "/notifications" };
    }
    default:
      return { text: "A notice from Upper Echelon.", href: "/notifications" };
  }
}
