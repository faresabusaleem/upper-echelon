import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { UpdatePasswordForm } from "@/components/auth/reset-forms";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Choose a new password" };

export default async function UpdatePasswordPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login?error=link");
  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col px-[var(--gutter)] pb-16 pt-14">
      <h1 className="font-display text-display-l text-ink">Choose a new password.</h1>
      <p className="mt-4 text-ink-2">You will stay signed in on this device.</p>
      <UpdatePasswordForm />
    </div>
  );
}
