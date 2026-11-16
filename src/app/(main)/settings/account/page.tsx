import type { Metadata } from "next";
import { requireViewer } from "@/lib/auth";
import { publicEnv } from "@/lib/env";
import { EmailForm, Identities, PasswordForm } from "@/components/settings/account-forms";

export const metadata: Metadata = { title: "Account settings" };

export default async function AccountPage() {
  const viewer = await requireViewer();
  return (
    <div className="flex flex-col gap-16">
      <section aria-labelledby="email-h">
        <h2 id="email-h" className="font-display text-display-s text-ink">Email</h2>
        <div className="mt-6"><EmailForm email={viewer.email} /></div>
      </section>
      <section aria-labelledby="password-h">
        <h2 id="password-h" className="font-display text-display-s text-ink">Password</h2>
        <div className="mt-6"><PasswordForm hasPassword={viewer.identities.includes("email")} /></div>
      </section>
      <section aria-labelledby="methods-h">
        <h2 id="methods-h" className="font-display text-display-s text-ink">Ways to sign in</h2>
        <div className="mt-6">
          <Identities providers={viewer.identities} googleEnabled={publicEnv.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED} />
        </div>
      </section>
    </div>
  );
}
