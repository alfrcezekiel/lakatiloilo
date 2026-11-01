"use client";

import { Check } from "lucide-react";
import { useEffect, useRef } from "react";
import { authButtonClass } from "@/components/AuthShell";

// A pop-up that says whether something worked, with one main button.
// Used by the Set new password page (ticket 46). It opens as soon as the
// page shows it; the page closes it by no longer showing it.
//
// It is the browser's own <dialog> element: while it is open, the page
// behind it cannot be clicked, keyboard focus stays inside it, Escape
// closes it, and screen readers read it out.
export function StatusModal({
  tone,
  title,
  message,
  actionLabel,
  onAction,
  onClose,
}: {
  tone: "success" | "error";
  title: string;
  message: string;
  actionLabel: string;
  onAction: () => void;
  // Escape, or the Close button (shown for errors only).
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="status-modal-title"
      aria-describedby="status-modal-message"
      onCancel={(event) => {
        // Escape: let the page decide what closing means.
        event.preventDefault();
        onClose();
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-3xl border border-white/25 bg-teal-900/90 p-6 text-center text-white shadow-2xl backdrop-blur-xl backdrop:bg-black/60"
    >
      {/* A tick or an exclamation mark in a circle; the title says the same in words. */}
      <div
        aria-hidden="true"
        className={`mx-auto mb-4 flex size-14 items-center justify-center rounded-full text-2xl font-bold ${
          tone === "success" ? "bg-emerald-300 text-teal-900" : "bg-amber-300 text-teal-900"
        }`}
      >
        {tone === "success" ? <Check className="size-7" strokeWidth={3} /> : "!"}
      </div>
      <h2 id="status-modal-title" className="font-fraunces text-2xl font-medium">
        {title}
      </h2>
      <p id="status-modal-message" className="mt-2 text-sm text-white/85">
        {message}
      </p>
      <button
        type="button"
        onClick={onAction}
        autoFocus
        className={`mt-6 ${authButtonClass}`}
      >
        {actionLabel}
      </button>
      {tone === "error" && (
        <button
          type="button"
          onClick={onClose}
          className="mt-3 text-sm text-white/85 underline underline-offset-2 hover:text-white"
        >
          Close
        </button>
      )}
    </dialog>
  );
}
