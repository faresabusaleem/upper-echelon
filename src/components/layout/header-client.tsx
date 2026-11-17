"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { getBrowserClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/ui/avatar";
import { BellIcon, CloseIcon, LetterIcon, MenuIcon } from "@/components/ui/icons";
import { TierMark } from "@/components/ui/tier-mark";
import { cn } from "@/lib/utils";

type Member = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  tier: number;
  isModerator: boolean;
  isAdmin: boolean;
  onboarded: boolean;
};

function Count({ n, label }: { n: number; label: string }) {
  if (n <= 0) return <span className="sr-only">No {label}</span>;
  return (
    <>
      <span
        aria-hidden
        className="figure absolute -right-0.5 -top-0.5 min-w-[1.15rem] rounded-full bg-ember px-1 text-center text-[0.6875rem] leading-[1.15rem] text-white"
      >
        {n > 99 ? "99+" : n}
      </span>
      <span className="sr-only">
        {n} unread {label}
      </span>
    </>
  );
}

/** Notification and message counters, kept live with Supabase Realtime. */
export function LiveCounts({ userId, initial }: { userId: string; initial: { notifications: number; messages: number } }) {
  const [counts, setCounts] = useState(initial);
  const pathname = usePathname();

  useEffect(() => {
    const supabase = getBrowserClient();
    const channel = supabase
      .channel(`counts:${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        () => setCounts((c) => ({ ...c, notifications: c.notifications + 1 })),
      )
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
        const row = payload.new as { sender_id?: string };
        if (row.sender_id && row.sender_id !== userId && !window.location.pathname.startsWith("/messages/")) {
          setCounts((c) => ({ ...c, messages: c.messages + 1 }));
        }
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId]);

  return (
    <div className="flex items-center gap-1">
      <Link
        href="/messages"
        className={cn(
          "relative inline-flex size-10 items-center justify-center rounded-full text-ink-2 hover:bg-panel hover:text-ink",
          pathname.startsWith("/messages") && "text-ink",
        )}
        aria-label="Messages"
      >
        <LetterIcon />
        <Count n={counts.messages} label="messages" />
      </Link>
      <Link
        href="/notifications"
        className={cn(
          "relative inline-flex size-10 items-center justify-center rounded-full text-ink-2 hover:bg-panel hover:text-ink",
          pathname.startsWith("/notifications") && "text-ink",
        )}
        aria-label="Notifications"
      >
        <BellIcon />
        <Count n={counts.notifications} label="notifications" />
      </Link>
    </div>
  );
}

/** The account menu on desktop and the full navigation sheet on small screens. */
export function HeaderMenu({ member, nav }: { member: Member | null; nav: { href: string; label: string }[] }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close the menu when the route changes (state adjusted during render, per the React docs).
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    const onClick = (e: MouseEvent) => {
      if (!panelRef.current?.contains(e.target as Node) && !buttonRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    panelRef.current?.querySelector<HTMLElement>("a,button")?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  const links: { href: string; label: string }[] = member
    ? [
        { href: `/u/${member.username}`, label: "Your profile" },
        { href: "/home", label: "Your desk" },
        { href: "/forum/bookmarks", label: "Bookmarks" },
        { href: "/settings", label: "Settings" },
        ...(member.isModerator ? [{ href: "/mod", label: "Moderation" }] : []),
        ...(member.isAdmin ? [{ href: "/admin", label: "Administration" }] : []),
      ]
    : [
        { href: "/login", label: "Sign in" },
        { href: "/join", label: "Begin your initiation" },
      ];

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="site-menu"
        className={cn(
          "inline-flex h-10 items-center gap-2.5 rounded-full pl-1 pr-2 text-ink-2 hover:bg-panel hover:text-ink",
          !member && "lg:hidden",
        )}
      >
        {member ? (
          <>
            <Avatar src={member.avatarUrl} name={member.displayName} size={30} />
            <span className="hidden sm:inline">
              <TierMark tier={member.tier} />
            </span>
            <span className="sr-only">Open account menu</span>
            <MenuIcon className="lg:hidden" />
          </>
        ) : (
          <>
            <MenuIcon />
            <span className="sr-only">Open menu</span>
          </>
        )}
      </button>
      {open && (
        <div
          id="site-menu"
          ref={panelRef}
          className="fixed inset-x-0 top-[var(--header-h)] z-50 max-h-[calc(100svh-var(--header-h))] overflow-y-auto border-b border-line bg-raised px-[var(--gutter)] pb-8 pt-4 shadow-[0_24px_48px_rgba(0,0,0,0.5)] lg:absolute lg:inset-x-auto lg:right-0 lg:top-12 lg:w-72 lg:rounded-xl lg:border lg:px-2 lg:pb-2 lg:pt-2"
        >
          <div className="mb-2 flex items-center justify-between lg:hidden">
            <span className="text-small text-muted">Menu</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex size-10 items-center justify-center text-ink-2 hover:bg-panel"
              aria-label="Close menu"
            >
              <CloseIcon />
            </button>
          </div>
          {member && (
            <div className="mb-2 px-3 py-3">
              <p className="font-display text-xl leading-tight text-ink">{member.displayName}</p>
              <p className="text-small text-muted">@{member.username}</p>
            </div>
          )}
          <nav aria-label="Sections" className="flex flex-col lg:hidden">
            {nav.map((item) => (
              <Link key={item.href} href={item.href} className="px-3 py-3 font-display text-2xl text-ink hover:bg-panel">
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="mt-2 flex flex-col lg:mt-0">
            {links.map((l) => (
              <Link key={l.href} href={l.href} className="rounded-lg px-3 py-2.5 text-ink-2 hover:bg-panel hover:text-ink">
                {l.label}
              </Link>
            ))}
            {member && (
              <form action="/auth/signout" method="post">
                <button type="submit" className="w-full rounded-lg px-3 py-2.5 text-left text-ink-2 hover:bg-panel hover:text-ink">
                  Sign out
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/** The main sections as tabs, with the current one underlined in gold. */
export function NavTabs({ nav, icons }: { nav: { href: string; label: string }[]; icons: Record<string, React.ReactNode> }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="hidden h-full items-stretch lg:flex">
      {nav.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative inline-flex items-center gap-2 px-3.5 text-[0.9rem] transition-colors duration-150",
              active ? "text-ink" : "text-ink-2 hover:text-ink",
            )}
          >
            <span className={cn(active ? "text-gold" : "text-muted")}>{icons[item.href]}</span>
            {item.label}
            <span
              aria-hidden
              className={cn(
                "absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-gold transition-opacity",
                active ? "opacity-100" : "opacity-0",
              )}
            />
          </Link>
        );
      })}
    </nav>
  );
}
