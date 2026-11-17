import Link from "next/link";
import { getViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Wordmark } from "@/components/brand/mark";
import { ButtonLink } from "@/components/ui/button";
import { SearchIcon } from "@/components/ui/icons";
import { Sigil } from "@/components/ui/sigils";
import { HeaderMenu, LiveCounts, NavTabs } from "./header-client";

export const NAV = [
  { href: "/forum", label: "Forum" },
  { href: "/arena", label: "Arena" },
  { href: "/directory", label: "Directory" },
  { href: "/leaderboards", label: "Ranks" },
  { href: "/members", label: "Members" },
];

const NAV_ICONS: Record<string, React.ReactNode> = {
  "/forum": <Sigil name="quill" size={17} />,
  "/arena": <Sigil name="sword" size={17} />,
  "/directory": <Sigil name="ledger" size={17} />,
  "/leaderboards": <Sigil name="crown" size={17} />,
  "/members": <Sigil name="circle" size={17} />,
};

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
          : "sticky top-0 z-40 border-b border-line bg-ground/95 supports-[backdrop-filter]:bg-ground/85 supports-[backdrop-filter]:backdrop-blur-md"
      }
    >
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-gold focus:px-4 focus:py-2 focus:text-ground"
      >
        Skip to content
      </a>
      <div className="mx-auto flex h-[var(--header-h)] max-w-[92rem] items-center gap-4 px-[var(--gutter)]">
        <Link href="/" className="flex shrink-0 items-center self-stretch" aria-label="Upper Echelon, home">
          <Wordmark />
        </Link>
        <NavTabs nav={NAV} icons={NAV_ICONS} />
        <form action="/forum/search" role="search" className="ml-auto hidden md:block">
          <label htmlFor="site-search" className="sr-only">
            Search the forum
          </label>
          <span className="relative block">
            <SearchIcon size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
            <input
              id="site-search"
              name="q"
              type="search"
              placeholder="Search the halls…"
              className="h-9 w-56 rounded-full border border-line-2 bg-panel pl-9 pr-3 text-small text-ink placeholder:text-faint focus:w-72 focus:border-gold-deep focus:outline-none xl:w-64"
            />
          </span>
        </form>
        <div className="ml-auto flex items-center gap-1.5 md:ml-0">
          {member ? (
            <LiveCounts key={`${counts.notifications}-${counts.messages}`} userId={member.id} initial={counts} />
          ) : (
            <div className="hidden items-center gap-3 sm:flex">
              <Link href="/login" className="text-[0.9rem] text-ink-2 hover:text-ink">
                Sign in
              </Link>
              <ButtonLink href="/join" size="sm">
                Join
              </ButtonLink>
            </div>
          )}
          <HeaderMenu member={member} nav={NAV} />
        </div>
      </div>
    </header>
  );
}
