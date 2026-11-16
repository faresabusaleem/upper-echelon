"use client";

import { useEffect } from "react";
import { markAllReadAction } from "./actions";

/** Viewing the list marks it read after a moment (the unread markers stay until the next visit). */
export function MarkReadOnView() {
  useEffect(() => {
    const t = setTimeout(() => void markAllReadAction(), 1500);
    return () => clearTimeout(t);
  }, []);
  return null;
}
