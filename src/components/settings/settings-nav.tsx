"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const ITEMS = [
  ["/settings/profile", "Profile"],
  ["/settings/account", "Account"],
  ["/settings/security", "Security"],
  ["/settings/privacy", "Privacy"],
  ["/settings/notifications", "Notifications"],
  ["/settings/appearance", "Appearance"],
  ["/settings/data", "Your data"],
];

export function SettingsNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Settings" className="mt-6 flex gap-1 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible">
      {ITEMS.map(([href, label]) => (
        <Link
          key={href}
          href={href}
          aria-current={pathname === href ? "page" : undefined}
          className={cn(
            "shrink-0 px-3 py-2.5 transition-colors",
            pathname === href ? "bg-panel text-ink" : "text-ink-2 hover:bg-raised hover:text-ink",
          )}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
