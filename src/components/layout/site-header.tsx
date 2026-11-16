import Link from "next/link";
import { getViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Wordmark } from "@/components/brand/mark";
import { ButtonLink } from "@/components/ui/button";
import { HeaderMenu, LiveCounts } from "./header-client";

export const NAV = [
  { href: "/arena", label: "Arena" },
  { href: "/directory", label: "Directory" },
  { href: "/forum", label: "Forum" },
  { href: "/leaderboards", label: "Leaderboards" },
];

export async function SiteHeader({ overlay = false }: { overlay?: boolean }) {
  const viewer = await getViewer();
  let counts = { notifications: 0, messages: 0 };
  if (viewer) {
    const supabase = await createClient();
    const { data } = await supabase.rpc("unread_counts");
    const row = Array.isArray(data) ? data[0] : data;
    if (row) counts = { notifications: Number(row.notifications ?? 0), messages: Number(row.messages ?? 0) };
  }
  const member = viewer
    ? {
        id: viewer.id,
        username: viewer.profile.username as string,
        displayName: viewer.profile.display_name,
        avatarUrl: viewer.profile.avatar_url,
        tier: viewer.profile.tier,
        isModerator: viewer.isModerator,
        isAdmin: viewer.isAdmin,
        onboarded: !!viewer.profile.onboarded_at,
      }
    : null;

  return (
    <header
      className={
        overlay
          ? "absolute inset-x-0 top-0 z-40"
          : "sticky top-0 z-40 bg-ground/95 supports-[backdrop-filter]:bg-ground/90"
      }
    >
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:bg-gold focus:px-4 focus:py-2 focus:text-ground"
      >
        Skip to content
      </a>
      <div className="mx-auto flex h-[var(--header-h)] max-w-[96rem] items-center justify-between gap-6 px-[var(--gutter)]">
        <Link href={member ? "/home" : "/"} className="shrink-0" aria-label="Upper Echelon, home">
          <Wordmark />
        </Link>
        <nav aria-label="Main" className="hidden items-center gap-7 lg:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-[0.9375rem] text-ink-2 transition-colors duration-150 hover:text-ink"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          {member ? (
            <LiveCounts userId={member.id} initial={counts} />
          ) : (
            <div className="hidden items-center gap-5 sm:flex">
              <Link href="/login" className="text-[0.9375rem] text-ink-2 hover:text-ink">
                Sign in
              </Link>
              <ButtonLink href="/join" size="sm">
                Begin your initiation
              </ButtonLink>
            </div>
          )}
          <HeaderMenu member={member} nav={NAV} />
        </div>
      </div>
    </header>
  );
}
