"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function ModNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const items = [
    ["/mod", "Reports"],
    ["/mod/flagged", "Flagged results"],
    ["/mod/members", "Members"],
    ["/mod/audit", "Audit log"],
    ...(isAdmin ? [["/mod/errors", "Errors"], ["/admin/directory", "Directory"]] : []),
  ];
  return (
    <nav aria-label="Moderation" className="mt-6 flex gap-2 overflow-x-auto pb-1">
      {items.map(([href, label]) => {
        const on = href === "/mod" ? pathname === "/mod" : pathname.startsWith(href);
        return (
          <Link key={href} href={href} aria-current={on ? "page" : undefined} className={cn("shrink-0 px-3 py-2 text-small", on ? "bg-gold text-ground" : "bg-panel text-ink-2 hover:bg-panel-2 hover:text-ink")}>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
