"use client";

import { Check, Send, X } from "lucide-react";
import { useState } from "react";
import { pillButton } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  addReviewPhoto,
  backendMessage,
  backendRefusal,
  createReview,
  deleteReviewPhoto,
  updateReview,
  type ReviewPhoto,
} from "@/lib/api";
import { loginToken } from "@/lib/login";
import { ReviewPhotoPicker } from "@/components/ReviewPhotoPicker";
import type { Review } from "@/components/ReviewsSection";

const MAX_COMMENT = 500;
const ratingWords = ["", "Poor", "Fair", "Good", "Very good", "Excellent"];

const fallbackError = "Something went wrong. Please try again.";

interface ReviewFormProps {
  placeType: "destination" | "accommodation";
  placeId: string;
  // Called with the saved review, so the list can show it straight away.
  onSaved: (review: Review) => void;
  // Editing: the traveler's own review, to fill the form in. Leave it out
  // to write a new review.
  existing?: Review;
  // Editing: called when the traveler clicks Cancel.
  onCancel?: () => void;
  // A new review: true while it is being posted and its photos uploaded,
  // false when done (ticket 113).
  onPostingChange?: (posting: boolean) => void;
}

// The review form: 1 to 5 stars and up to 500 characters. Writes a new
// review, or edits the traveler's own one when `existing` is given. The
// database checks everything again (see supabase/sql/020), so this form
// is about friendly messages, not about security.
export function ReviewForm({
  placeType,
  placeId,
  onSaved,
  existing,
  onCancel,
  onPostingChange,
}: ReviewFormProps) {
  // The review as last saved. Normally `existing` (or nothing for a new
  // review); after a save whose photos did not all upload, the saved
  // review, so trying again edits it instead of posting a second one.
  const [saved, setSaved] = useState<Review | undefined>(existing);
  const isEdit = !!saved;
  const [rating, setRating] = useState(existing?.rating ?? 0);
  // The star under the mouse, so the stars light up before clicking.
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState(existing?.comment ?? "");
  const [ratingError, setRatingError] = useState<string | null>(null);
  const [commentError, setCommentError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Photos (ticket 113): new files to upload when saving, and the ids of
  // the review's current photos the traveler removed.
  const [files, setFiles] = useState<File[]>([]);
  const [removedIds, setRemovedIds] = useState<string[]>([]);
  // "Adding photo 2 of 3…" while uploading.
  const [progress, setProgress] = useState<string | null>(null);
  const currentPhotos = (saved?.photos ?? []).filter((p) => !removedIds.includes(p.id));

  const length = comment.trim().length;
  const tooLong = length > MAX_COMMENT;
  const shown = hovered || rating;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    const newRatingError = rating < 1 ? "Please pick 1 to 5 stars." : null;
    const newCommentError =
      length === 0
        ? "Please write a few words about your visit."
        : tooLong
          ? `Please keep your review to ${MAX_COMMENT} characters or fewer.`
          : null;
    setRatingError(newRatingError);
    setCommentError(newCommentError);
    if (newRatingError || newCommentError) return;

    setBusy(true);
    onPostingChange?.(true);
    // Stays true when a photo was refused, so the form (with its message)
    // stays on screen until the traveler saves again.
    let keepOpen = false;
    try {
      const token = await loginToken();
      if (!token) {
        setFormError("Please log in again, then try again.");
        return;
      }
      const fields = { rating, comment: comment.trim() };
      // 1. The review itself, as JSON: editing (PATCH /v1/reviews/:id)
      //    changes only the stars and comment; a new review (POST
      //    /v1/reviews) sends the place too, and the database fills in who
      //    wrote it, their name and the dates. Removed photos go first, so
      //    the saved review answers with the photos it still has.
      let review: Review;
      if (saved) {
        for (const id of removedIds) {
          await deleteReviewPhoto(token, saved.id, id).catch((error) => {
            // Already gone (404) is fine; anything else stops here.
            if (backendRefusal(error)?.status !== 404) throw error;
          });
        }
        setRemovedIds([]);
        review = await updateReview(token, saved.id, fields);
      } else {
        review = await createReview(token, { place_type: placeType, place_id: placeId, ...fields });
      }
      setSaved(review);

      // 2. New photos, one request each (four 2 MB photos together would be
      //    too big for one request). A refused photo stays in the form with
      //    the reason, and the others are still added.
      const added: ReviewPhoto[] = [];
      const failed: File[] = [];
      let reason: string | null = null;
      for (const [index, file] of files.entries()) {
        setProgress(`Adding photo ${index + 1} of ${files.length}…`);
        try {
          added.push(await addReviewPhoto(token, review.id, file));
        } catch (error) {
          failed.push(file);
          reason ??= backendMessage(error) ?? fallbackError;
        }
      }
      const withPhotos: Review = {
        ...review,
        photos: [...(review.photos ?? []), ...added].sort((a, b) => a.position - b.position),
      };
      setSaved(withPhotos);
      setFiles(failed);
      if (failed.length > 0) {
        keepOpen = true;
        setFormError(
          `Your review was saved, but ${failed.length === 1 ? "a photo" : `${failed.length} photos`} could not be added: ${reason} Remove ${failed.length === 1 ? "it" : "them"} or try again.`,
        );
        return;
      }
      onSaved(withPhotos);
    } catch (error) {
      // The backend explains its refusals in plain words (for example
      // "You've already reviewed this place."); otherwise a general one.
      setFormError(backendMessage(error) ?? fallbackError);
    } finally {
      setBusy(false);
      setProgress(null);
      if (!keepOpen) onPostingChange?.(false);
    }
  };

  return (
    <Card className="bg-white/15 border border-white/25 text-white shadow-none">
      <CardContent className="p-5">
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {/* Stars: five radio buttons that look like stars, so mouse,
              touch and keyboard (Tab, then arrow keys) all work. */}
          <fieldset>
            <legend className="mb-2 text-sm font-semibold">Your rating</legend>
            <div className="flex items-center gap-3">
              <div className="flex" onMouseLeave={() => setHovered(0)}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <label
                    key={n}
                    onMouseEnter={() => setHovered(n)}
                    className="cursor-pointer rounded-md px-0.5 has-focus-visible:outline-2 has-focus-visible:outline-white"
                  >
                    <input
                      type="radio"
                      name={`rating-${placeId}`}
                      value={n}
                      checked={rating === n}
                      onChange={() => {
                        setRating(n);
                        setRatingError(null);
                      }}
                      className="sr-only"
                    />
                    <span
                      aria-hidden="true"
                      className={`text-3xl leading-none transition-colors ${n <= shown ? "text-amber-300" : "text-white/30"
                        }`}
                    >
                      ★
                    </span>
                    <span className="sr-only">
                      {n} star{n === 1 ? "" : "s"}, {ratingWords[n]}
                    </span>
                  </label>
                ))}
              </div>
              <span aria-hidden="true" className="text-sm text-white/80">
                {ratingWords[shown]}
              </span>
            </div>
            {ratingError && (
              <p role="alert" className="mt-1 text-sm text-amber-200">
                {ratingError}
              </p>
            )}
          </fieldset>

          <div className="space-y-2">
            <Label htmlFor={`review-${placeId}`} className="text-sm font-semibold text-white">
              Your review
            </Label>
            <Textarea
              id={`review-${placeId}`}
              value={comment}
              onChange={(e) => {
                setComment(e.target.value);
                setCommentError(null);
              }}
              rows={4}
              placeholder="What was it like? Tips for other travelers?"
              aria-invalid={!!commentError}
              aria-describedby={`review-${placeId}-count`}
              className="border-white/25 bg-white/10 text-white placeholder:text-white/50"
            />
            <div className="flex items-start justify-between gap-3">
              {commentError ? (
                <p role="alert" className="text-sm text-amber-200">
                  {commentError}
                </p>
              ) : (
                <span />
              )}
              <span
                id={`review-${placeId}-count`}
                className={`shrink-0 text-xs ${tooLong ? "text-amber-200" : "text-white/70"}`}
              >
                {length} / {MAX_COMMENT}
              </span>
            </div>
          </div>

          <ReviewPhotoPicker
            current={currentPhotos}
            onRemoveCurrent={(id) => setRemovedIds((ids) => [...ids, id])}
            files={files}
            onFilesChange={(next) => {
              setFiles(next);
              setFormError(null);
            }}
            disabled={busy}
          />

          <div className="flex flex-wrap items-center gap-3">
            {/* disabled while saving, so it cannot be sent twice. */}
            <button type="submit" disabled={busy} className={pillButton({ kind: "main" })}>
              {busy ? <Spinner /> : isEdit ? <Check aria-hidden="true" /> : <Send aria-hidden="true" />}
              {busy
                ? (progress ?? (isEdit ? "Saving…" : "Posting…"))
                : isEdit
                  ? "Save changes"
                  : "Post review"}
            </button>
            {isEdit && (
              <button
                type="button"
                onClick={onCancel}
                disabled={busy}
                className={pillButton({ kind: "glass" })}
              >
                <X aria-hidden="true" />
                Cancel
              </button>
            )}
          </div>

          {formError && (
            <p role="alert" className="text-sm text-amber-200">
              {formError}
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
