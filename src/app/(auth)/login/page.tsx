import type { Metadata } from "next";
import Link from "next/link";
import { LoginForms } from "@/components/auth/login-forms";
import { GoogleButton } from "@/components/auth/google-button";
import { Notice } from "@/components/ui/notice";
import { Mark } from "@/components/brand/mark";
import { safeNext } from "@/lib/utils";

export const metadata: Metadata = { title: "Sign in" };

const ERRORS: Record<string, string> = {
  link: "That link has expired or was already used. Request a new one.",
  google: "Google sign-in did not complete. Try again or use your email.",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const sp = await searchParams;
  const next = safeNext(typeof sp.next === "string" ? sp.next : null);
  const error = typeof sp.error === "string" ? ERRORS[sp.error] : undefined;
  return (
    <div className="mx-auto grid w-full max-w-6xl flex-1 gap-16 px-[var(--gutter)] pb-16 pt-10 lg:grid-cols-[minmax(0,30rem)_1fr] lg:pt-20">
      <div className="flex flex-col gap-8">
        <div>
          <h1 className="font-display text-display-l text-ink">Welcome back.</h1>
          <p className="mt-4 text-ink-2">The room is as you left it.</p>
        </div>
        {error && <Notice tone="error">{error}</Notice>}
        <LoginForms next={next} />
        <GoogleButton next={next} />
        <p className="text-small text-muted">
          Not yet a member?{" "}
          <Link href="/join" className="text-ink underline">
            Begin your initiation
          </Link>
        </p>
      </div>
      <div className="hidden items-start justify-end lg:flex">
        <Mark size={360} decorative strokeWidth={1.2} className="text-panel-3" lit="coronal" />
      </div>
    </div>
  );
}
