"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { backendMessage, deleteReview as deleteReviewOnBackend } from "@/lib/api";
import { loginToken } from "@/lib/auth";
import { ReviewForm } from "@/components/ReviewForm";
import type { Review } from "@/components/ReviewsSection";

interface MyReviewBoxProps {
  review: Review;
  placeType: "destination" | "accommodation";
  placeId: string;
  // True right after the traveler posted, to say thank you.
  justPosted: boolean;
  // Called with the edited review, so the list shows the new version.
  onSaved: (review: Review) => void;
  // Called after the review is deleted, so the list drops it.
  onDeleted: (reviewId: string) => void;
}

// Shown instead of the review form when the logged-in traveler already
// reviewed this place (one review per place). Says so clearly and offers
// Edit (the same form, filled in) and Delete (after "are you sure?").
export function MyReviewBox({
  review,
  placeType,
  placeId,
  justPosted,
  onSaved,
  onDeleted,
}: MyReviewBoxProps) {
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const deleteReview = async () => {
    setDeleting(true);
    setDeleteError(null);
    try {
      // Deleted by the NestJS backend (DELETE /v1/reviews/:id), as this
      // traveler. Row Level Security makes someone else's review
      // invisible there, so the backend refuses with a plain message
      // (for example, after logging out in another tab).
      const token = await loginToken();
      if (!token) {
        setDeleteError("We couldn't delete your review. Please log in again and try.");
        return;
      }
      await deleteReviewOnBackend(token, review.id);
      onDeleted(review.id);
    } catch (error) {
      setDeleteError(backendMessage(error) ?? "Something went wrong. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  if (editing) {
    return (
      <ReviewForm
        placeType={placeType}
        placeId={placeId}
        existing={review}
        onCancel={() => setEditing(false)}
        onSaved={(saved) => {
          onSaved(saved);
          setEditing(false);
        }}
      />
    );
  }

  return (
    <Card className="bg-white/15 backdrop-blur-md border border-white/25 text-white">
      <CardContent className="p-5 space-y-3">
        {justPosted ? (
          <p role="status" className="font-semibold">
            Thanks! Your review is posted.
          </p>
        ) : (
          <p className="font-semibold">You&apos;ve already reviewed this place.</p>
        )}
        <p className="text-sm text-white/80">
          Each traveler can leave one review per place. Yours is marked
          &ldquo;You&rdquo; below.
        </p>

        {confirmingDelete ? (
          <div className="space-y-3 rounded-xl bg-teal-950/40 p-4">
            <p className="font-semibold">Delete your review? This can&apos;t be undone.</p>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={deleteReview}
                disabled={deleting}
                className="h-10 rounded-full bg-red-500 px-5 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-60"
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmingDelete(false);
                  setDeleteError(null);
                }}
                disabled={deleting}
                className="h-10 rounded-full border border-white/40 px-5 text-sm font-semibold hover:bg-white/10"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="h-10 rounded-full bg-white px-5 text-sm font-semibold text-teal-900 hover:bg-white/90"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              className="h-10 rounded-full border border-white/40 px-5 text-sm font-semibold hover:bg-white/10"
            >
              Delete
            </button>
          </div>
        )}

        {deleteError && (
          <p role="alert" className="text-sm text-amber-200">
            {deleteError}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
