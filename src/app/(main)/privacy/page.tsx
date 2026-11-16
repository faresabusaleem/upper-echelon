import Link from "next/link";
import type { Metadata } from "next";
import { Document } from "@/components/legal/document";
import { contactEmail } from "@/lib/site";

export const metadata: Metadata = { title: "Privacy policy", description: "What Upper Echelon collects, why, for how long, and your rights." };

export default function PrivacyPage() {
  const email = contactEmail();
  return (
    <Document title="Privacy policy" lede="What we collect, why, for how long, and what you can do about it." updated="17 November 2026" draft>
      <h2>Who is responsible</h2>
      <p>
        Upper Echelon is run by its owner (the “controller”). Contact: {email ? <a href={`mailto:${email}`}>{email}</a> : "the address on the contact page"}.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li><strong>Account:</strong> email address, a password (stored only as a hash by our authentication provider), and, if you use Google sign-in, your Google account identifier, name and profile picture address.</li>
        <li><strong>Date of birth:</strong> to confirm you are at least 13. It is never shown to anyone, including other members.</li>
        <li><strong>Profile:</strong> username, display name and anything you choose to add: portrait, banner, bio, location, pronouns, interests, links, theme and showcase.</li>
        <li><strong>Arena:</strong> each saved result with the raw timings needed to verify it, your bests, practice days, streaks, ratings and ranks.</li>
        <li><strong>Directory:</strong> results you log from tests, optional proof screenshots and notes.</li>
        <li><strong>Forum:</strong> threads, replies, edits and their history, votes, poll votes, bookmarks, followed threads, tags and drafts.</li>
        <li><strong>Social:</strong> who you follow, block and mute, private messages and their read state, notifications.</li>
        <li><strong>Safety:</strong> reports you make or that concern you (with a copy of the reported content), warnings, mutes and suspensions, and the moderators’ audit log.</li>
        <li><strong>Technical:</strong> a salted, one-way hash of your IP address for rate limiting (the address itself is not stored by us); error reports (message, page, browser) when something breaks; our providers’ standard server logs.</li>
      </ul>
      <p>Images you upload are re-encoded on our server before they are stored; this removes EXIF data such as GPS location.</p>

      <h2>Why, and on what basis</h2>
      <ul>
        <li>To provide the service you signed up for: accounts, profiles, the Arena, the Directory, the Forum, messages (contract).</li>
        <li>To keep members safe and the site fair: age checks, rate limits, bot checks, anti-cheat, moderation (legitimate interests and legal obligations).</li>
        <li>To send emails you need (confirmation, sign-in, password reset) and those you choose in notification settings (contract and consent, which you can withdraw at any time).</li>
        <li>To understand how the site performs, with privacy-friendly analytics that set no cookies and do not identify you (legitimate interests).</li>
      </ul>
      <p>We do not sell personal data, show advertising, or build advertising profiles.</p>

      <h2>Who processes it for us</h2>
      <ul>
        <li><strong>Supabase</strong>: database, authentication, file storage and realtime updates.</li>
        <li><strong>Vercel</strong>: hosting, cookieless Web Analytics and Speed Insights.</li>
        <li><strong>Cloudflare Turnstile</strong>: the human check on sign-up and some sign-in forms. It processes signals from your browser to tell people from bots.</li>
        <li><strong>An email provider</strong> (for example Brevo): delivery of notification emails, if configured.</li>
        <li><strong>Google</strong>: only if you choose to sign in with Google.</li>
      </ul>
      <p>These providers may process data outside your country under their own safeguards (such as standard contractual clauses).</p>

      <h2>How long we keep it</h2>
      <ul>
        <li>Account and content: until you delete them or your account.</li>
        <li>Sign-ups never confirmed: deleted after 7 days.</li>
        <li>Rate-limit records: 2 days. Error reports: 30 days. Sent-email records: 30 days.</li>
        <li>Moderation records may be kept after an account is deleted where needed to protect members (for example, to prevent a banned person from returning), in minimal form.</li>
      </ul>

      <h2>Your rights</h2>
      <p>You can, at any time and without asking us:</p>
      <ul>
        <li><strong>See and correct</strong> your data in <Link href="/settings/profile">settings</Link>.</li>
        <li><strong>Control visibility</strong> of your results, activity and connections in <Link href="/settings/privacy">privacy settings</Link>.</li>
        <li><strong>Download</strong> everything we hold about you as a JSON file from <Link href="/settings/data">your data</Link>.</li>
        <li><strong>Delete</strong> your account from the same page. This removes your profile, results, logged tests, images, messages and posts. Threads that contain other members’ replies keep their title, with your opening post and name removed, so the conversation still makes sense.</li>
      </ul>
      <p>
        You may also object to processing, ask us to restrict it, or complain to your data-protection authority. Contact us first if you can; we will
        answer within one month.
      </p>

      <h2>Children</h2>
      <p>
        Members must be at least 13. If you are under the age of digital consent where you live, you confirm a parent or
        guardian agrees. If we learn an account belongs to someone under 13, we delete it. Private messages default to
        “people I follow” and can be turned off entirely.
      </p>

      <h2>Cookies</h2>
      <p>We use only essential cookies. See the <Link href="/cookies">cookie notice</Link>.</p>

      <h2>Changes</h2>
      <p>We will announce material changes on the Notice Board and update the date above.</p>
    </Document>
  );
}
