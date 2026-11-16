import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { MfaForm } from "@/components/auth/mfa-form";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/utils";

export const metadata: Metadata = { title: "Two-factor check" };

export default async function MfaPage({ searchParams }: PageProps<"/login/mfa">) {
  const sp = await searchParams;
  const next = safeNext(typeof sp.next === "string" ? sp.next : null);
  const supabase = await createClient();
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) redirect("/login");
  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col px-[var(--gutter)] pb-16 pt-14">
      <h1 className="font-display text-display-l text-ink">One more key.</h1>
      <p className="mt-4 text-ink-2">Enter the six-digit code from your authenticator app.</p>
      <MfaForm next={next} />
      <form action="/auth/signout" method="post" className="mt-10">
        <button className="text-small text-ink-2 underline hover:text-ink">Sign out instead</button>
      </form>
    </div>
  );
}
