"use client";

import { useTransition } from "react";
import { reviewResultAction } from "@/app/(main)/mod/actions";
import { Button } from "@/components/ui/button";

export function FlaggedActions({ id }: { id: number }) {
  const [pending, start] = useTransition();
  return (
    <span className="flex gap-2">
      <Button size="sm" variant="secondary" disabled={pending} onClick={() => start(async () => void (await reviewResultAction(id, true)))}>Clear (it is genuine)</Button>
      <Button size="sm" variant="quiet" disabled={pending} onClick={() => start(async () => void (await reviewResultAction(id, false)))}>Keep excluded</Button>
    </span>
  );
}
