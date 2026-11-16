import type { Metadata } from "next";
import { ResetRequestForm } from "@/components/auth/reset-forms";

export const metadata: Metadata = { title: "Reset your password" };

export default function ResetPage() {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col px-[var(--gutter)] pb-16 pt-14">
      <h1 className="font-display text-display-l text-ink">A new key.</h1>
      <p className="mt-4 text-ink-2">Enter your email and we will send a link to choose a new password.</p>
      <ResetRequestForm />
    </div>
  );
}
