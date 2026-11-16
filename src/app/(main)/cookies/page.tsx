import type { Metadata } from "next";
import { Document } from "@/components/legal/document";

export const metadata: Metadata = { title: "Cookie notice", description: "Upper Echelon uses only essential cookies." };

export default function CookiesPage() {
  return (
    <Document title="Cookie notice" lede="Only what is needed to keep you signed in." updated="17 November 2026" draft>
      <p>We do not use advertising, tracking or analytics cookies. Because we only use essential cookies, there is nothing to consent to.</p>
      <table>
        <thead>
          <tr><th>Name</th><th>Purpose</th><th>Lifetime</th></tr>
        </thead>
        <tbody>
          <tr><td><code>sb-…-auth-token</code></td><td>Keeps you signed in (set by our authentication provider, Supabase).</td><td>Until you sign out, refreshed while you use the site</td></tr>
          <tr><td><code>sb-…-code-verifier</code></td><td>Protects sign-in and email links against interception (PKCE).</td><td>Minutes</td></tr>
          <tr><td>Cloudflare Turnstile</td><td>May set short-lived values while the human check runs on sign-up and some sign-in forms.</td><td>Session</td></tr>
        </tbody>
      </table>
      <h2>Local storage</h2>
      <p>
        Your browser also keeps, on your device only: unsent drafts of posts, and whether you dismissed the cookie notice.
        Nothing in local storage is sent to us.
      </p>
      <h2>Analytics</h2>
      <p>
        We use Vercel Web Analytics and Speed Insights, which measure page views and performance without cookies and
        without identifying you.
      </p>
    </Document>
  );
}
