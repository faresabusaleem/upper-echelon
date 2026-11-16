import Link from "next/link";
import { Mark } from "@/components/brand/mark";
import { ButtonLink } from "@/components/ui/button";

export const metadata = { title: "Not found" };

export default function NotFound() {
  return (
    <main id="main" className="flex min-h-svh flex-col justify-between px-[var(--gutter)] py-8">
      <Link href="/" className="font-display text-xl text-ink">
        Upper Echelon
      </Link>
      <div className="mx-auto grid w-full max-w-6xl items-center gap-12 py-16 md:grid-cols-[1.1fr_1fr]">
        <div>
          <p className="figure text-small text-muted">404</p>
          <h1 className="mt-4 font-display text-display-l text-ink">This door does not open.</h1>
          <p className="mt-6 max-w-[42ch] text-lede text-ink-2">
            The page you were looking for is not here. It may have been moved, removed, or never existed.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <ButtonLink href="/">Return to the entrance</ButtonLink>
            <ButtonLink href="/forum" variant="secondary">
              Visit the Forum
            </ButtonLink>
          </div>
        </div>
        <Mark size="100%" decorative className="mx-auto max-w-[22rem] text-panel-3" strokeWidth={1.2} lit="sagittal" />
      </div>
      <p className="text-micro text-muted">If you followed a link here from inside the site, tell us on the contact page.</p>
    </main>
  );
}
