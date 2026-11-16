import Link from "next/link";
import { Wordmark } from "@/components/brand/mark";

/** A focused frame for joining and signing in: the wordmark, the task, nothing else. */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="px-[var(--gutter)]">
        <div className="mx-auto flex h-[var(--header-h)] max-w-[96rem] items-center justify-between">
          <Link href="/" aria-label="Upper Echelon, home">
            <Wordmark />
          </Link>
          <Link href="/" className="text-small text-muted hover:text-ink">
            Return
          </Link>
        </div>
      </header>
      <main id="main" className="flex flex-1 flex-col">
        {children}
      </main>
    </>
  );
}
