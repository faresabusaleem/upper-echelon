"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { CloseIcon } from "./icons";

/** Native <dialog>: modal, focus-trapped and dismissible with Escape, styled in tone. */
export function Dialog({
  open,
  onClose,
  title,
  children,
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className={`m-auto w-[calc(100%-2rem)] ${wide ? "max-w-2xl" : "max-w-lg"} bg-raised p-0 text-ink shadow-[0_32px_80px_rgba(0,0,0,0.6)] backdrop:bg-black/70`}
      aria-labelledby="dialog-title"
    >
      <div className="flex items-start justify-between gap-6 px-6 pt-6">
        <h2 id="dialog-title" className="font-display text-display-s text-ink">
          {title}
        </h2>
        <button type="button" onClick={onClose} className="-mr-2 inline-flex size-10 items-center justify-center text-ink-2 hover:bg-panel" aria-label="Close">
          <CloseIcon />
        </button>
      </div>
      <div className="px-6 pb-6 pt-4">{children}</div>
    </dialog>
  );
}
