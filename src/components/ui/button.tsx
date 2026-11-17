import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "quiet" | "danger" | "link";
type Size = "sm" | "md" | "lg";

const base =
  "relative inline-flex items-center justify-center gap-2 rounded-lg font-sans font-medium select-none whitespace-nowrap " +
  "transition-[background-color,color,transform] duration-[160ms] ease-[var(--ease-out-soft)] " +
  "active:translate-y-px active:scale-[0.985] disabled:pointer-events-none disabled:opacity-50 " +
  "aria-disabled:pointer-events-none aria-disabled:opacity-50";

const variants: Record<Variant, string> = {
  primary: "bg-gold text-ground hover:bg-gold-bright",
  secondary: "bg-panel-2 text-ink hover:bg-panel-3",
  quiet: "bg-transparent text-ink hover:bg-panel",
  danger: "bg-danger-wash text-danger hover:bg-[#2e1a16]",
  link: "bg-transparent px-0! h-auto! text-ink underline decoration-1 underline-offset-[0.25em] hover:text-gold-bright",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3.5 text-[0.875rem]",
  md: "h-11 px-5 text-[0.9375rem]",
  lg: "h-13 px-7 text-[1rem]",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", className?: string) {
  return cn(base, variants[variant], sizes[size], className);
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentProps<"button"> & { variant?: Variant; size?: Size }) {
  return <button className={buttonClass(variant, size, className)} {...props} />;
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant; size?: Size; children: ReactNode }) {
  return (
    <Link className={buttonClass(variant, size, className)} {...props}>
      {children}
    </Link>
  );
}
