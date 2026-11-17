"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { getBrowserClient } from "@/lib/supabase/client";
import { ReportDialog } from "@/components/social/report-dialog";
import { Avatar } from "@/components/ui/avatar";
import { FlagIcon } from "@/components/ui/icons";
import { THEMES, tierInfo } from "@/lib/tiers";
import { cn, timeAgo } from "@/lib/utils";

type Author = {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  tier: number;
  role: string;
  is_staff: boolean;
};
export type Shout = { id: number; body: string; created_at: string; author_id: string; author: Author | null };
type Viewer = { id: string; canSpeak: boolean; isModerator: boolean; onboarded: boolean } | null;

const MAX = 300;

function colour(tier: number) {
  return THEMES[tierInfo(tier).theme].accent;
}

/** Turns @names into links; everything else stays plain text. */
function Body({ text }: { text: string }) {
  const parts = text.split(/(@[A-Za-z0-9_]{3,20})/g);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith("@") && i % 2 === 1 ? (
          <Link key={i} href={`/u/${p.slice(1)}`} className="text-gold-bright hover:underline">
            {p}
          </Link>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}

/** The Circle: a short, live conversation for the whole society, beside every hub page. */
export function Circle({ initial, viewer, hiddenIds }: { initial: Shout[]; viewer: Viewer; hiddenIds: string[] }) {
  const [shouts, setShouts] = useState<Shout[]>(initial);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [reporting, setReporting] = useState<number | null>(null);
  const [pending, start] = useTransition();
  const listRef = useRef<HTMLOListElement>(null);
  const stick = useRef(true);
  const authors = useRef(new Map<string, Author>(initial.flatMap((s) => (s.author ? [[s.author.id, s.author] as const] : []))));
  const hidden = useRef(new Set(hiddenIds));

  // Keep the newest message in view unless the reader has scrolled up to read older ones.
  useEffect(() => {
    const el = listRef.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [shouts]);

  useEffect(() => {
    const supabase = getBrowserClient();
    const channel = supabase
      .channel("circle")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "shouts" }, async (payload) => {
        const row = payload.new as Omit<Shout, "author"> & { removed_at: string | null };
        if (row.removed_at || hidden.current.has(row.author_id)) return;
        let author = authors.current.get(row.author_id) ?? null;
        if (!author) {
          const { data } = await supabase
            .from("profiles")
            .select("id, username, display_name, avatar_url, tier, role, is_staff")
            .eq("id", row.author_id)
            .maybeSingle();
          author = (data as Author | null) ?? null;
          if (author) authors.current.set(author.id, author);
        }
        setShouts((list) => (list.some((s) => s.id === row.id) ? list : [...list.slice(-79), { ...row, author }]));
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "shouts" }, (payload) => {
        const row = payload.new as { id: number; removed_at: string | null };
        if (row.removed_at) setShouts((list) => list.filter((s) => s.id !== row.id));
      })
      .subscribe();
    return () => void supabase.removeChannel(channel);
  }, []);

  const send = () => {
    const body = text.trim();
    if (!body || pending) return;
    setError(null);
    start(async () => {
      const { error: err } = await getBrowserClient().from("shouts").insert({ body });
      if (err) {
        setError(err.message || "That did not send. Try again in a moment.");
        return;
      }
      stick.current = true;
      setText("");
    });
  };

  const remove = (id: number) =>
    start(async () => {
      const { error: err } = await getBrowserClient().rpc("mod_set_removed", {
        p_type: "shout",
        p_id: String(id),
        p_removed: true,
        p_reason: "Removed from the Circle",
      });
      if (err) setError(err.message);
      else setShouts((list) => list.filter((s) => s.id !== id));
    });

  return (
    <section className="panel flex flex-col" aria-labelledby="circle-h">
      <h2 id="circle-h" className="panel-head">
        <span className="inline-flex items-center gap-2">
          <span aria-hidden className="relative inline-flex size-2">
            <span className="absolute inset-0 animate-ping rounded-full bg-gold/60" />
            <span className="relative size-2 rounded-full bg-gold" />
          </span>
          The Circle
        </span>
        <small>live</small>
      </h2>
      <ol
        ref={listRef}
        onScroll={(e) => {
          const el = e.currentTarget;
          stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
        }}
        className="flex h-[19rem] flex-col gap-2.5 overflow-y-auto px-3.5 py-3"
        aria-live="polite"
        aria-relevant="additions"
      >
        {shouts.length === 0 && (
          <li className="m-auto max-w-[24ch] text-center text-small text-muted">The Circle is quiet. Say the first word.</li>
        )}
        {shouts.map((s) => {
          const a = s.author;
          const mine = viewer?.id === s.author_id;
          return (
            <li key={s.id} className="group flex gap-2.5">
              <Avatar src={a?.avatar_url} name={a?.display_name ?? "?"} size={26} className="mt-0.5" />
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-baseline gap-x-1.5 text-micro">
                  {a ? (
                    <Link href={`/u/${a.username}`} className="font-medium hover:underline" style={{ color: colour(a.tier) }}>
                      {a.display_name}
                    </Link>
                  ) : (
                    <span className="text-muted">A former member</span>
                  )}
                  {a?.is_staff && <span className="text-gold">· staff</span>}
                  <time dateTime={s.created_at} suppressHydrationWarning className="text-faint">
                    {timeAgo(s.created_at)}
                  </time>
                  <span className="ml-auto hidden gap-1 group-hover:inline-flex group-focus-within:inline-flex">
                    {viewer && !mine && (
                      <button type="button" onClick={() => setReporting(s.id)} className="text-faint hover:text-ink" aria-label="Report this message">
                        <FlagIcon size={13} />
                      </button>
                    )}
                    {viewer?.isModerator && (
                      <button type="button" onClick={() => remove(s.id)} className="text-faint hover:text-danger" aria-label="Remove this message">
                        ×
                      </button>
                    )}
                  </span>
                </p>
                <p className="break-words text-small leading-snug text-ink">
                  <Body text={s.body} />
                </p>
              </div>
            </li>
          );
        })}
      </ol>
      <div className="border-t border-line p-3">
        {viewer?.canSpeak ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
            className="flex flex-col gap-1.5"
          >
            <div className="flex gap-2">
              <label htmlFor="circle-input" className="sr-only">
                Say something to the Circle
              </label>
              <input
                id="circle-input"
                value={text}
                maxLength={MAX}
                onChange={(e) => setText(e.target.value)}
                placeholder="Speak to the Circle…"
                autoComplete="off"
                className="h-9 min-w-0 flex-1 rounded-lg border border-line-2 bg-panel px-3 text-small text-ink placeholder:text-faint focus:border-gold-deep focus:outline-none"
              />
              <button
                type="submit"
                disabled={!text.trim() || pending}
                className="h-9 rounded-lg bg-gold px-3 text-small font-medium text-ground hover:bg-gold-bright disabled:opacity-50"
              >
                Send
              </button>
            </div>
            <div className="flex justify-between text-micro">
              <span className={cn(error ? "text-danger" : "text-faint")} role={error ? "alert" : undefined}>
                {error ?? "Be kind. @name to call someone."}
              </span>
              <span className={cn("figure", text.length > MAX - 30 ? "text-gold" : "text-faint")}>{MAX - text.length}</span>
            </div>
          </form>
        ) : viewer && !viewer.onboarded ? (
          <p className="text-small text-muted">
            Finish your <Link href="/initiation" className="text-ink underline">initiation</Link> to speak.
          </p>
        ) : viewer ? (
          <p className="text-small text-muted">You cannot speak in the Circle right now.</p>
        ) : (
          <p className="text-small text-muted">
            <Link href="/join" className="text-ink underline">Join</Link> or <Link href="/login" className="text-ink underline">sign in</Link> to speak.
          </p>
        )}
      </div>
      <ReportDialog
        open={reporting !== null}
        onClose={() => setReporting(null)}
        targetType="shout"
        targetId={String(reporting ?? "")}
        subject="this message"
      />
    </section>
  );
}
