"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { blockAction, followAction, muteAction, startConversationAction, unfollowAction } from "@/lib/actions/social";
import { Button, ButtonLink } from "@/components/ui/button";
import { MoreIcon } from "@/components/ui/icons";
import { Notice } from "@/components/ui/notice";
import { ReportDialog } from "./report-dialog";

export function ProfileActions({
  targetId,
  username,
  isSelf,
  isMember,
  following,
  blocked,
  muted,
  canMessage,
}: {
  targetId: string;
  username: string;
  isSelf: boolean;
  isMember: boolean;
  following: boolean;
  blocked: boolean;
  muted: boolean;
  canMessage: boolean;
}) {
  const [pending, start] = useTransition();
  const [menu, setMenu] = useState(false);
  const [report, setReport] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const path = `/u/${username}`;

  if (isSelf) {
    return (
      <div className="flex gap-3">
        <ButtonLink href="/settings/profile" variant="secondary">
          Edit profile
        </ButtonLink>
      </div>
    );
  }
  if (!isMember) {
    return (
      <ButtonLink href={`/login?next=${encodeURIComponent(path)}`} variant="secondary">
        Sign in to follow
      </ButtonLink>
    );
  }

  const run = (fn: () => Promise<{ ok: boolean; message?: string }>) =>
    start(async () => {
      const res = await fn();
      setMenu(false);
      if (!res.ok || res.message) setMessage({ tone: res.ok ? "success" : "error", text: res.message ?? "" });
    });

  return (
    <div className="flex flex-col items-start gap-3">
      <div className="relative flex flex-wrap gap-3">
        {!blocked &&
          (following ? (
            <Button variant="secondary" disabled={pending} onClick={() => run(() => unfollowAction(targetId, username))}>
              Following
            </Button>
          ) : (
            <Button disabled={pending} onClick={() => run(() => followAction(targetId, username))}>
              Follow
            </Button>
          ))}
        {canMessage && !blocked && (
          <Button variant="secondary" disabled={pending} onClick={() => run(() => startConversationAction(targetId))}>
            Message
          </Button>
        )}
        <Button variant="quiet" aria-label="More actions" aria-expanded={menu} onClick={() => setMenu((m) => !m)} className="px-3">
          <MoreIcon />
        </Button>
        {menu && (
          <div className="absolute left-0 top-14 z-30 flex w-56 flex-col bg-panel-2 p-1 shadow-[0_16px_40px_rgba(0,0,0,0.5)]">
            <button className="px-3 py-2.5 text-left text-ink-2 hover:bg-panel-3 hover:text-ink" onClick={() => run(() => muteAction(targetId, !muted, path))}>
              {muted ? "Unmute" : "Mute"}
            </button>
            <button className="px-3 py-2.5 text-left text-ink-2 hover:bg-panel-3 hover:text-ink" onClick={() => run(() => blockAction(targetId, !blocked, path))}>
              {blocked ? "Unblock" : "Block"}
            </button>
            <button
              className="px-3 py-2.5 text-left text-danger hover:bg-panel-3"
              onClick={() => {
                setMenu(false);
                setReport(true);
              }}
            >
              Report profile
            </button>
            <Link href="/guidelines" className="px-3 py-2.5 text-small text-muted hover:bg-panel-3">
              Community guidelines
            </Link>
          </div>
        )}
      </div>
      {message && <Notice tone={message.tone}>{message.text}</Notice>}
      <ReportDialog open={report} onClose={() => setReport(false)} targetType="profile" targetId={targetId} subject={`@${username}`} />
    </div>
  );
}
