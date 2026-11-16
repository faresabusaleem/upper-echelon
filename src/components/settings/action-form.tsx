"use client";

import { createContext, useActionState, useContext, type ReactNode } from "react";
import type { ActionResult } from "@/lib/errors";
import { Notice } from "@/components/ui/notice";

type State = ActionResult | null;
const ErrorsContext = createContext<Record<string, string>>({});
export const useFieldErrors = () => useContext(ErrorsContext);

/** A form bound to a Server Action, with a status line for success, errors and rate limits. */
export function ActionForm({
  action,
  children,
  className,
}: {
  action: (state: State, formData: FormData) => Promise<State>;
  children: ReactNode;
  className?: string;
}) {
  const [state, formAction] = useActionState<State, FormData>(action, null);
  const errors = state && !state.ok ? (state.fieldErrors ?? {}) : {};
  return (
    <ErrorsContext value={errors}>
      <form action={formAction} className={className ?? "flex flex-col gap-6"}>
        {children}
        {state && (
          <Notice tone={state.ok ? "success" : state.kind === "rate_limited" ? "warning" : "error"}>{state.message}</Notice>
        )}
      </form>
    </ErrorsContext>
  );
}
