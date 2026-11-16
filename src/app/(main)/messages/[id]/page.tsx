import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Avatar } from "@/components/ui/avatar";
import { TierMark } from "@/components/ui/tier-mark";
import { Conversation } from "@/components/messages/conversation";

export const metadata: Metadata = { title: "Conversation", robots: { index: false } };

export default async function ConversationPage({ params }: PageProps<"/messages/[id]">) {
  const { id } = await params;
  const viewer = await requireViewer({ next: "/messages" });
  const supabase = await createClient();
  const { data: conv } = await supabase.from("conversations").select("*").eq("id", id).maybeSingle();
  if (!conv) notFound();
  const otherId = conv.user_a === viewer.id ? conv.user_b : conv.user_a;
  const [{ data: other }, { data: messages }, { data: canSend }, { data: blocked }] = await Promise.all([
    supabase.from("profiles").select("id, username, display_name, avatar_url, tier").eq("id", otherId).maybeSingle(),
    supabase.from("messages").select("id, sender_id, body, created_at").eq("conversation_id", id).order("created_at", { ascending: false }).limit(200),
    supabase.rpc("can_message", { sender: viewer.id, recipient: otherId }),
    supabase.from("blocks").select("blocker_id").eq("blocker_id", viewer.id).eq("blocked_id", otherId).maybeSingle(),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-[var(--gutter)] pb-6 pt-8">
      <nav aria-label="Breadcrumb" className="text-small text-muted">
        <Link href="/messages" className="hover:text-ink">Messages</Link>
      </nav>
      <header className="mt-4 flex items-center gap-4">
        <Avatar src={other?.avatar_url} name={other?.display_name ?? "?"} size={48} />
        <div>
          <h1 className="font-display text-display-s text-ink">
            {other ? <Link href={`/u/${other.username}`} className="hover:text-gold-bright">{other.display_name}</Link> : "A former member"}
          </h1>
          {other && (
            <p className="text-small text-muted">
              @{other.username} · <TierMark tier={other.tier} withName />
            </p>
          )}
        </div>
      </header>
      <Conversation
        conversationId={id}
        viewerId={viewer.id}
        otherId={otherId}
        otherName={other?.display_name ?? "this member"}
        initial={(messages ?? []).reverse()}
        canSend={!!canSend && !viewer.mute}
        blocked={!!blocked}
        muted={!!viewer.mute}
      />
    </div>
  );
}
