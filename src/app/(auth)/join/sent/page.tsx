import type { Metadata } from "next";
import Link from "next/link";
import { Mark } from "@/components/brand/mark";

export const metadata: Metadata = { title: "A letter is on its way" };

export default function SentPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-[var(--gutter)] py-20">
      <Mark size={64} decorative lit="transverse" className="text-ink-2" strokeWidth={2.2} />
      <h1 className="mt-10 font-display text-display-l text-ink">A letter is on its way.</h1>
      <p className="mt-6 max-w-[48ch] text-lede text-ink-2">
        We sent a confirmation link to the address you gave. Open it on this device to finish your initiation. The
        link works once and expires within the hour.
      </p>
      <p className="mt-6 max-w-[56ch] text-muted">
        Nothing arrived? Check the spam folder, wait a minute, or{" "}
        <Link href="/join" className="text-ink underline">
          start again
        </Link>
        . If you already have an account, the letter will not be sent twice; try{" "}
        <Link href="/login" className="text-ink underline">
          signing in
        </Link>
        .
      </p>
    </div>
  );
}
