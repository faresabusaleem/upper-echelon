import Link from "next/link";

const LINKS = [
  { href: "/about", label: "About" },
  { href: "/guidelines", label: "Guidelines" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/cookies", label: "Cookies" },
  { href: "/contact", label: "Contact" },
];

/** A quiet closing line: what this is, the house rules, the year. */
export function SiteFooter({ credits }: { credits?: React.ReactNode }) {
  const year = new Date().getUTCFullYear();
  return (
    <footer className="mt-auto px-[var(--gutter)] pb-8 pt-24 text-small">
      {credits && <div className="mx-auto mb-10 max-w-[96rem] text-micro text-muted">{credits}</div>}
      <div className="mx-auto grid max-w-[96rem] gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-baseline">
        <p className="text-muted">A society for sharp minds.</p>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="text-ink hover:text-gold-bright">
              {l.label}
            </Link>
          ))}
        </nav>
        <p className="text-muted sm:text-right">© {year} Upper Echelon</p>
      </div>
    </footer>
  );
}
