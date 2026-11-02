"use client";

import { Flag, Send, X } from "lucide-react";
import { useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { pillButton } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { backendMessage, reportReview, type ReportReason, type Traveler } from "@/lib/api";
import { loginToken } from "@/lib/login";

const MAX_NOTE = 300;
const REASONS: { id: ReportReason; label: string }[] = [
  { id: "spam", label: "Spam" },
  { id: "offensive", label: "Offensive" },
  { id: "not_about_place", label: "Not about this place" },
  { id: "other", label: "Other" },
];

// "Report" on someone else's review (review extras round, ticket 80).
// Shown only to logged-in travelers, never on their own review. It opens a
// pop-up (the browser's own <dialog>, so Escape closes it and the keyboard
// stays inside it) with four reasons and an optional note. After sending,
// the pop-up says "Thanks — the team will take a look." (or "You've already
// reported this review."), and the link becomes "Reported". Nothing is
// hidden automatically; the team reads reports in the Supabase dashboard.
export function ReportReview({
  reviewId,
  reviewerId,
  user,
}: {
  reviewId: string;
  reviewerId: string;
  user: Traveler | null;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const titleId = useId();
  const noteId = useId();

  if (!user || user.id === reviewerId) return null;

  const open = () => {
    setError(null);
    dialog.current?.showModal();
  };
  const close = () => dialog.current?.close();

  const send = async () => {
    if (!reason) {
      setError("Please choose a reason.");
      return;
    }
    if (note.trim().length > MAX_NOTE) {
      setError(`Please keep the note to ${MAX_NOTE} characters.`);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const token = await loginToken();
      if (!token) {
        setError("Please log in again, then try again.");
        return;
      }
      const answer = await reportReview(token, reviewId, reason, note.trim());
      setDone(answer.message);
    } catch (e) {
      // "You've already reported this review." is a finished state too.
      const message = backendMessage(e);
      if (message?.includes("already reported")) setDone(message);
      else setError(message ?? "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {done ? (
        <span className="flex items-center gap-1.5 text-sm text-white/60">
          <Flag aria-hidden="true" className="size-3.5" />
          Reported
        </span>
      ) : (
        <button
          type="button"
          onClick={open}
          className="flex items-center gap-1.5 rounded text-sm text-white/70 underline-offset-4 hover:text-white hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          <Flag aria-hidden="true" className="size-3.5" />
          Report
        </button>
      )}

      <dialog
        ref={dialog}
        aria-labelledby={titleId}
        className="m-auto w-[min(28rem,calc(100%-2rem))] rounded-2xl border border-white/20 bg-teal-950 p-0 text-white backdrop:bg-black/60"
      >
        <div className="space-y-4 p-6">
          <h2 id={titleId} className="font-fraunces text-2xl font-medium">
            Report this review
          </h2>

          {done ? (
            <>
              <p role="status">{done}</p>
              <button type="button" onClick={close} className={pillButton({ kind: "main" })}>
                Close
              </button>
            </>
          ) : (
            <>
              <fieldset>
                <legend className="mb-2 text-sm font-semibold">Why are you reporting it?</legend>
                <div className="space-y-2">
                  {REASONS.map((r) => (
                    <label
                      key={r.id}
                      className={cn(
                        "flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-sm has-focus-visible:outline-2 has-focus-visible:outline-white",
                        reason === r.id
                          ? "border-amber-300 bg-amber-400/15"
                          : "border-white/20 hover:bg-white/10",
                      )}
                    >
                      <input
                        type="radio"
                        name={`report-${reviewId}`}
                        value={r.id}
                        checked={reason === r.id}
                        onChange={() => {
                          setReason(r.id);
                          setError(null);
                        }}
                        className="accent-amber-400"
                      />
                      {r.label}
                    </label>
                  ))}
                </div>
              </fieldset>

              <div className="space-y-1.5">
                <label htmlFor={noteId} className="text-sm font-semibold">
                  Anything else? <span className="font-normal text-white/65">(optional)</span>
                </label>
                <Textarea
                  id={noteId}
                  value={note}
                  onChange={(e) => {
                    setNote(e.target.value);
                    setError(null);
                  }}
                  rows={3}
                  className="border-white/25 bg-white/10 text-white placeholder:text-white/50"
                />
                <p className="text-right text-xs text-white/65">
                  {note.trim().length} / {MAX_NOTE}
                </p>
              </div>

              {error && (
                <p role="alert" className="text-sm text-amber-200">
                  {error}
                </p>
              )}

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={send}
                  disabled={busy}
                  className={pillButton({ kind: "main" })}
                >
                  {busy ? <Spinner /> : <Send aria-hidden="true" />}
                  {busy ? "Sending…" : "Send report"}
                </button>
                <button
                  type="button"
                  onClick={close}
                  disabled={busy}
                  className={pillButton({ kind: "glass" })}
                >
                  <X aria-hidden="true" />
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      </dialog>
    </>
  );
}
