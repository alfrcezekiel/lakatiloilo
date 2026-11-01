"use client";

import { Pencil, Trash2, X } from "lucide-react";
import { useState } from "react";
import { pillButton } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Card, CardContent } from "@/components/ui/card";
import { backendMessage, deleteReview as deleteReviewOnBackend } from "@/lib/api";
import { loginToken } from "@/lib/login";
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
  // Called after the review is deleted, with the backend's message, so
  // the list drops it and the page can say it worked.
  onDeleted: (reviewId: string, message: string) => void;
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
      const deleted = await deleteReviewOnBackend(token, review.id);
      onDeleted(review.id, deleted.message);
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
    <Card className="bg-white/15 border border-white/25 text-white shadow-none">
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
              {/* The only solid red button: the final, can't-undo step. */}
              <button
                type="button"
                onClick={deleteReview}
                disabled={deleting}
                className={pillButton({ kind: "dangerSolid" })}
              >
                {deleting ? <Spinner /> : <Trash2 aria-hidden="true" />}
                {deleting ? "Deleting…" : "Yes, delete"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmingDelete(false);
                  setDeleteError(null);
                }}
                disabled={deleting}
                className={pillButton({ kind: "glass" })}
              >
                <X aria-hidden="true" />
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className={pillButton({ kind: "glass" })}
            >
              <Pencil aria-hidden="true" />
              Edit
            </button>
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              className={pillButton({ kind: "danger" })}
            >
              <Trash2 aria-hidden="true" />
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
