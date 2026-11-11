"use client";

import { Eye, EyeOff, Trash2 } from "lucide-react";
import { useState } from "react";
import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { ConfirmDeleteDialog } from "@/components/admin/ConfirmDeleteDialog";
import { scheduleDelete } from "@/components/admin/PendingDeletes";
import { ADMIN_REVIEWS_KEY, REPORTS_KEY, errorMessage } from "@/components/admin/admin-ui";
import { Spinner } from "@/components/ui/spinner";
import {
  adminDeletePaths,
  adminHideReview,
  adminShowReview,
  type AdminReview,
  type AdminReviewPage,
} from "@/lib/api";
import { freshToken } from "@/lib/login";
import { cn } from "@/lib/utils";

// The buttons under each review on the Reviews screen (full admin
// management round): Hide it or Show it (ticket 123) and Delete review
// (123, with Undo for 8 seconds since 127). Moved out of AdminReviews.tsx
// in the code review of 2026-11-11 to keep that file to the list itself.

// Changes one review in every loaded list (each search and filter), so
// the screen updates at once; the lists are then asked again.
function updateLoadedReviews(
  queryClient: QueryClient,
  change: (review: AdminReview) => AdminReview | null,
) {
  queryClient.setQueriesData<AdminReviewPage>({ queryKey: ADMIN_REVIEWS_KEY }, (data) => {
    if (!data) return data;
    const reviews = data.reviews.flatMap((review) => {
      const changed = change(review);
      return changed ? [changed] : [];
    });
    return { ...data, reviews, total: data.total - (data.reviews.length - reviews.length) };
  });
}

const actionButton =
  "inline-flex min-h-11 cursor-pointer items-center justify-center gap-1.5 rounded-xl border px-3 text-center text-sm leading-tight font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-default disabled:opacity-60 sm:gap-2 sm:px-4";

export type OnDone = (message: string) => void;

// Hide it or Show it, and Delete review (ticket 123). Show it brings a
// hidden review back and keeps its reports (unlike Keep it on the Reports
// screen). Delete review asks in a pop-up first.
export function ReviewActions({ review, onDone }: { review: AdminReview; onDone: OnDone }) {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState<"visibility" | "delete" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const who = `${review.reviewer_name}'s review of ${review.place_name}`;

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ADMIN_REVIEWS_KEY });
    void queryClient.invalidateQueries({ queryKey: REPORTS_KEY });
    void queryClient.invalidateQueries({ queryKey: ["admin", "overview"] });
  };

  const toggle = async () => {
    setBusy("visibility");
    setError(null);
    try {
      const token = await freshToken();
      if (!token) throw new Error("Please log in again, then try again.");
      const { message } = await (review.hidden ? adminShowReview : adminHideReview)(token, review.id);
      updateLoadedReviews(queryClient, (r) => (r.id === review.id ? { ...r, hidden: !review.hidden } : r));
      refresh();
      onDone(`${who}: ${message}`);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const remove = async () => {
    setBusy("delete");
    setDeleteError(null);
    try {
      // Undo for 8 seconds first (ticket 127): the card leaves the list
      // now; the delete is sent when the time runs out or the admin
      // leaves the page.
      await scheduleDelete({
        key: `review:${review.id}`,
        label: `${who} deleted`,
        path: adminDeletePaths.review(review.id),
        refresh: [ADMIN_REVIEWS_KEY, REPORTS_KEY, ["admin", "overview"]],
      });
      setConfirming(false);
    } catch (e) {
      setDeleteError(errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="mt-4">
      {/* Phones: two equal halves, like Edit and Delete on Places. */}
      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        <button
          type="button"
          onClick={() => void toggle()}
          disabled={busy !== null}
          className={cn(
            actionButton,
            review.hidden
              ? "border-emerald-300/70 text-emerald-200 hover:border-emerald-200 hover:text-white"
              : "border-white/40 text-white hover:border-amber-300 hover:text-amber-300",
          )}
        >
          {busy === "visibility" ? (
            <Spinner />
          ) : review.hidden ? (
            <Eye aria-hidden="true" className="size-4" />
          ) : (
            <EyeOff aria-hidden="true" className="size-4" />
          )}
          {busy === "visibility" ? (review.hidden ? "Showing…" : "Hiding…") : review.hidden ? "Show it" : "Hide it"}
        </button>
        <button
          type="button"
          onClick={() => {
            setDeleteError(null);
            setConfirming(true);
          }}
          disabled={busy !== null}
          aria-label={`Delete review: ${who}`}
          className={cn(actionButton, "border-red-300/70 text-red-200 hover:border-red-200 hover:text-white")}
        >
          <Trash2 aria-hidden="true" className="size-4 shrink-0" />
          {/* "Delete" on phones (half a 320 px card is too narrow for the
              full name); the pop-up says it is the review. */}
          <span className="sm:hidden">Delete</span>
          <span className="hidden sm:inline">Delete review</span>
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-2 text-sm font-medium text-amber-200">
          {error}
        </p>
      )}
      <ConfirmDeleteDialog
        open={confirming}
        title="Delete this review for good?"
        message={`${who}. Its replies, Helpful marks, reports and photos are deleted too. You can Undo for 8 seconds.`}
        busy={busy === "delete"}
        error={deleteError}
        onConfirm={() => void remove()}
        onClose={() => setConfirming(false)}
      />
    </div>
  );
}
