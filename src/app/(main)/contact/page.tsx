import Link from "next/link";
import type { Metadata } from "next";
import { Document } from "@/components/legal/document";
import { contactEmail } from "@/lib/site";

export const metadata: Metadata = { title: "Contact", description: "How to reach Upper Echelon." };

export default function ContactPage() {
  const email = contactEmail();
  return (
    <Document title="Contact" lede="The quickest way to the right person.">
      <h2>Content or a member</h2>
      <p>
        Use the report option on the thread, reply, profile, image or message. Reports go straight to the moderators,
        privately. If anyone is in immediate danger, contact local emergency services first.
      </p>
      <h2>Your data</h2>
      <p>
        Download or delete your data yourself from <Link href="/settings/data">settings</Link>. For anything else about
        privacy, write to us.
      </p>
      <h2>Everything else</h2>
      <p>
        {email ? (
          <>Email <a href={`mailto:${email}`}>{email}</a>. We read everything; we answer within a few days.</>
        ) : (
          <>Ask in the <Link href="/forum/c/notice-board">Notice Board</Link> or the <Link href="/forum/c/off-topic">Off-Topic</Link> room, or message the staff account.</>
        )}
      </p>
      <h2>A test for the Directory</h2>
      <p>
        Suggest it in <Link href="/forum/c/test-discussions">Test Discussions</Link> with a link to its official page.
      </p>
    </Document>
  );
}
