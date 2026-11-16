import Link from "next/link";
import type { Metadata } from "next";
import { Document } from "@/components/legal/document";

export const metadata: Metadata = { title: "Terms of service", description: "The terms for using Upper Echelon." };

export default function TermsPage() {
  return (
    <Document title="Terms of service" lede="The agreement between you and Upper Echelon." updated="17 November 2026" draft>
      <h2>Joining</h2>
      <p>
        You must be at least 13 years old, and old enough to agree to these terms where you live (or have a parent or
        guardian agree for you). One person, one account. Keep your password safe; you are responsible for what happens
        under your account.
      </p>

      <h2>The service</h2>
      <p>
        Upper Echelon is free. We may change, suspend or end any part of it. The Arena’s trials are recreational
        cognitive tasks, not diagnostic or clinical instruments, and not intelligence tests. Ratings and percentiles
        compare members with each other and with an editorial reference scale.
      </p>

      <h2>The Directory</h2>
      <p>
        The Directory lists tests run by independent authors and organisations. We are not affiliated with them, host
        none of their questions, and are not responsible for their content, fees, scoring or availability. Results you
        log are self-reported; we do not verify them.
      </p>

      <h2>Your content</h2>
      <p>
        You keep ownership of what you post. You give Upper Echelon a worldwide, non-exclusive, royalty-free licence to
        host, display and distribute it on the service for as long as it is there. You must have the right to post it,
        and it must follow the <Link href="/guidelines">community guidelines</Link>.
      </p>

      <h2>Fair play</h2>
      <p>
        Do not cheat in the Arena, attack or overload the service, scrape it at scale, bypass rate limits or security, or
        create accounts automatically. Do not share answers to live tests.
      </p>

      <h2>Moderation and ending</h2>
      <p>
        We may remove content and warn, mute or suspend accounts that break these terms or the guidelines. You may delete
        your account at any time in <Link href="/settings/data">settings</Link>.
      </p>

      <h2>Liability</h2>
      <p>
        The service is provided “as is”, without warranties. To the extent the law allows, we are not liable for indirect
        losses, or for content posted by members or third-party sites linked from the Directory. Nothing in these terms
        limits rights you have under consumer law.
      </p>

      <h2>Changes and law</h2>
      <p>
        We may update these terms; we will announce material changes on the Notice Board. These terms are governed by the
        law of the owner’s country of residence, unless your local consumer law requires otherwise.
      </p>
    </Document>
  );
}
