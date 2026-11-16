import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Tone = "info" | "success" | "error" | "warning";
const tones: Record<Tone, string> = {
  info: "bg-panel text-ink-2",
  success: "bg-ok-wash text-ok",
  error: "bg-danger-wash text-danger",
  warning: "bg-gold-wash text-gold-bright",
};

export function Notice({
  tone = "info",
  title,
  children,
  className,
  role,
}: {
  tone?: Tone;
  title?: ReactNode;
  children?: ReactNode;
  className?: string;
  role?: "status" | "alert";
}) {
  return (
    <div role={role ?? (tone === "error" ? "alert" : "status")} className={cn("px-4 py-3 text-small", tones[tone], className)}>
      {title && <p className="font-medium">{title}</p>}
      {children && <div className={cn(title && "mt-1 opacity-90")}>{children}</div>}
    </div>
  );
}
