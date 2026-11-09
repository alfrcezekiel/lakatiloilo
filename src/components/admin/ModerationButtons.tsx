"use client";

import { Check, EyeOff, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { REPORTS_KEY, errorMessage } from "@/components/admin/admin-ui";
import { Spinner } from "@/components/ui/spinner";
import {
  adminDeleteReview,
  adminHideReview,
  adminKeepReview,
  type ReportedReview,
} from "@/lib/api";
import { freshToken } from "@/lib/login";
import { cn } from "@/lib/utils";

// The action buttons: outlined, 44 px tall, colour on hover (never a
// white box).
const actionButton =
  "inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border px-4 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-default disabled:opacity-60";

type Action = "keep" | "hide" | "delete";

// Keep it, Hide it and Delete review for one reported review (ticket 109).
// The list changes at once: Keep it and Delete review take the review off
// the list, Hide it marks it Hidden. Then the list is asked again, so it
// matches the database. Delete review asks "Yes, delete" first.
export function ModerationButtons({
  review,
  onDone,
}: {
  review: ReportedReview;
  onDone: (message: string) => void;
}) {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState<Action | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const deleteButton = useRef<HTMLButtonElement>(null);

  const run = async (action: Action) => {
    setBusy(action);
    setError(null);
    try {
      const token = await freshToken();
      if (!token) throw new Error("Please log in again, then try again.");
      const call =
        action === "keep" ? adminKeepReview : action === "hide" ? adminHideReview : adminDeleteReview;
      const { message } = await call(token, review.id);
      queryClient.setQueryData<ReportedReview[]>(REPORTS_KEY, (list) =>
        action === "hide"
          ? list?.map((r) => (r.id === review.id ? { ...r, hidden: true } : r))
          : list?.filter((r) => r.id !== review.id),
      );
      void queryClient.invalidateQueries({ queryKey: REPORTS_KEY });
      onDone(`${review.place_name}, ${review.reviewer_name}'s review: ${message}`);
      setConfirming(false);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  if (confirming) {
    return (
      <div role="group" aria-label="Confirm delete" className="mt-5 rounded-xl border border-red-300/60 p-4">
        <p className="font-semibold">Delete this review for good?</p>
        <p className="mt-1 text-sm text-white/85">
          Its replies, Helpful marks, reports and photo are deleted too. This cannot be undone.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            autoFocus
            onClick={() => void run("delete")}
            disabled={busy !== null}
            className={cn(actionButton, "border-red-500 bg-red-600 text-white hover:bg-red-500")}
          >
            {busy === "delete" ? <Spinner /> : <Trash2 aria-hidden="true" className="size-4" />}
            {busy === "delete" ? "Deleting…" : "Yes, delete"}
          </button>
          <button
            type="button"
            onClick={() => {
              setConfirming(false);
              setError(null);
              requestAnimationFrame(() => deleteButton.current?.focus());
            }}
            disabled={busy !== null}
            className={cn(actionButton, "border-white/40 text-white hover:border-amber-300 hover:text-amber-300")}
          >
            Cancel
          </button>
        </div>
        {error && (
          <p role="alert" className="mt-2 text-sm font-medium text-amber-200">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="mt-5">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void run("keep")}
          disabled={busy !== null}
          className={cn(actionButton, "border-emerald-300/70 text-emerald-200 hover:border-emerald-200 hover:text-white")}
        >
          {busy === "keep" ? <Spinner /> : <Check aria-hidden="true" className="size-4" />}
          {busy === "keep" ? "Keeping…" : "Keep it"}
        </button>
        <button
          type="button"
          onClick={() => void run("hide")}
          disabled={busy !== null || review.hidden}
          className={cn(actionButton, "border-white/40 text-white hover:border-amber-300 hover:text-amber-300")}
        >
          {busy === "hide" ? <Spinner /> : <EyeOff aria-hidden="true" className="size-4" />}
          {busy === "hide" ? "Hiding…" : review.hidden ? "Hidden" : "Hide it"}
        </button>
        <button
          ref={deleteButton}
          type="button"
          onClick={() => {
            setError(null);
            setConfirming(true);
          }}
          disabled={busy !== null}
          className={cn(actionButton, "border-red-300/70 text-red-200 hover:border-red-200 hover:text-white")}
        >
          <Trash2 aria-hidden="true" className="size-4" />
          Delete review
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-2 text-sm font-medium text-amber-200">
          {error}
        </p>
      )}
    </div>
  );
}
