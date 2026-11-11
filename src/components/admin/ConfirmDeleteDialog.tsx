"use client";

import { Trash2 } from "lucide-react";
import { useEffect, useId, useRef } from "react";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

// The dashboard's "Delete …?" pop-up (team request 2026-11-10: a pop-up,
// not a step at the bottom of the page). Used for places (ticket 121) and
// reviews (123), and next for replies and likes.
//
// It is the browser's own <dialog>: while it is open the page behind
// cannot be clicked, keyboard focus stays inside, Escape or a click on the
// dimmed area works like Cancel, and screen readers read it out. Cancel is
// focused first, so Enter never deletes by accident. Closing puts the
// focus back on the button that opened it.

const button =
  "inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-full border px-5 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-default disabled:opacity-60";

export function ConfirmDeleteDialog({
  open,
  title,
  message,
  busy,
  error,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  message: string;
  busy: boolean;
  // A refusal from the backend, shown inside the pop-up.
  error: string | null;
  onConfirm: () => void;
  // Cancel, Escape or a click outside the box (not while deleting).
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) element.showModal();
    if (!open && element.open) element.close();
  }, [open]);

  const cancel = () => {
    if (!busy) onClose();
  };

  return (
    <dialog
      ref={dialog}
      aria-labelledby={`${titleId}-title`}
      aria-describedby={`${titleId}-text`}
      onCancel={(event) => {
        // Escape: closing is up to the page (and never while deleting).
        event.preventDefault();
        cancel();
      }}
      onClick={(event) => {
        if (event.target === dialog.current) cancel();
      }}
      className="m-auto w-[min(28rem,calc(100%-2rem))] rounded-2xl border border-red-300/50 bg-teal-950 p-6 text-left text-white shadow-2xl backdrop:bg-black/60"
    >
      {open && (
        <>
          <div
            aria-hidden="true"
            className="mb-4 flex size-12 items-center justify-center rounded-full bg-red-600 text-white"
          >
            <Trash2 className="size-6" />
          </div>
          <h2 id={`${titleId}-title`} className="font-fraunces text-xl font-medium wrap-break-word">
            {title}
          </h2>
          <p id={`${titleId}-text`} className="mt-2 text-sm text-white/85">
            {message}
          </p>
          {error && (
            <p role="alert" className="mt-3 text-sm font-medium text-amber-200">
              {error}
            </p>
          )}
          <div className="mt-5 flex flex-wrap justify-end gap-2">
            <button
              type="button"
              autoFocus
              onClick={cancel}
              disabled={busy}
              className={cn(button, "border-white/40 text-white hover:border-amber-300 hover:text-amber-300")}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={busy}
              className={cn(button, "border-red-500 bg-red-600 text-white hover:bg-red-500")}
            >
              {busy ? <Spinner /> : <Trash2 aria-hidden="true" className="size-4" />}
              {busy ? "Deleting…" : "Yes, delete"}
            </button>
          </div>
        </>
      )}
    </dialog>
  );
}
