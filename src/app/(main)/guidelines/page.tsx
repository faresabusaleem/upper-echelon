import Link from "next/link";
import type { Metadata } from "next";
import { Document } from "@/components/legal/document";

export const metadata: Metadata = { title: "Community guidelines", description: "How we argue, what we do not allow, and how moderation works." };

export default function GuidelinesPage() {
  return (
    <Document title="Community guidelines" lede="Argue hard about ideas. Be gentle with people." updated="17 November 2026" draft>
      <p>
        Upper Echelon includes members from thirteen years old. These guidelines apply everywhere on the site: threads,
        replies, profiles, images and private messages.
      </p>

      <h2>How we argue</h2>
      <ul>
        <li>Engage with the strongest version of a view before you reject it.</li>
        <li>Criticise arguments, not the people making them.</li>
        <li>Show your working. Cite sources where you can.</li>
        <li>Mark spoilers for puzzles with <code>||double bars||</code>.</li>
        <li>If a reply in an advice thread helped you, mark it as the answer.</li>
      </ul>

      <h2>What is not allowed</h2>
      <ul>
        <li>Harassment, bullying, threats, or encouraging anyone to harm themselves.</li>
        <li>Hate or discrimination based on who someone is.</li>
        <li>Sexual content of any kind. Any sexualisation of minors is reported to the authorities.</li>
        <li>Asking a member who may be under eighteen for personal details, photos, or to move to another platform.</li>
        <li>Sharing anyone’s private information, including your own address or phone number.</li>
        <li>
          Answers, hints or item discussion for live intelligence tests, including anything in the Directory. It ruins the
          tests for everyone and breaks their authors’ terms.
        </li>
        <li>Cheating in the Arena: scripts, macros, bots or tampering with results.</li>
        <li>Spam, advertising, or impersonating another person or organisation.</li>
        <li>Illegal content, or content you do not have the right to share.</li>
      </ul>

      <h2>Private messages</h2>
      <p>
        By default only people you follow can message you. You can change this in{" "}
        <Link href="/settings/privacy">privacy settings</Link>, block anyone at any time, and report any message. Moderators
        cannot read private conversations unless a participant reports a message.
      </p>

      <h2>Reporting</h2>
      <p>
        Every thread, reply, profile, image and message has a report option. Reports are private: the person you report is
        not told who reported them. If someone is in immediate danger, contact local emergency services first.
      </p>

      <h2>What moderators do</h2>
      <p>
        Moderators can remove and restore content, issue warnings, mute members (no posting or messages) for a period, and
        suspend accounts temporarily or permanently. Each action is recorded in an audit log. You are notified when an
        action affects you, with the reason. If you think a decision was wrong, use the <Link href="/contact">contact page</Link>.
      </p>

      <h2>Ranks are not authority</h2>
      <p>A higher tier is a record of effort, not a licence to talk down to anyone. Everyone here started as an Initiate.</p>
    </Document>
  );
}
