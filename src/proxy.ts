import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy-session";

// Areas that require a signed-in member. Fine-grained checks (onboarding, bans, roles, 2FA)
// happen in the data access layer (src/lib/auth.ts); this is only the fast, optimistic gate.
const PROTECTED = [
  "/home",
  "/initiation",
  "/messages",
  "/notifications",
  "/settings",
  "/mod",
  "/admin",
  "/forum/new",
  "/forum/bookmarks",
];

export async function proxy(request: NextRequest) {
  const { response, userId } = await updateSession(request);
  const { pathname, search } = request.nextUrl;

  if (!userId && PROTECTED.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }
  if (userId && (pathname === "/login" || pathname === "/join")) {
    const url = request.nextUrl.clone();
    url.pathname = "/home";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = {
  matcher: [
    // Everything except static assets, images and metadata files.
    "/((?!_next/static|_next/image|favicon.ico|icons/|images/|brand/|sw.js|manifest.webmanifest|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|woff2?)$).*)",
  ],
};
