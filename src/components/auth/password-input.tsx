"use client";

import { useState, type ComponentProps } from "react";
import { Input } from "@/components/ui/field";

export function PasswordInput(props: ComponentProps<typeof Input>) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input {...props} type={show ? "text" : "password"} className="pr-20" />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute right-2 top-1/2 h-9 -translate-y-1/2 px-3 text-small text-muted hover:text-ink"
        aria-label={show ? "Hide password" : "Show password"}
      >
        {show ? "Hide" : "Show"}
      </button>
    </div>
  );
}
