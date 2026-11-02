"use client";

import { Check, Send, X } from "lucide-react";
import { useState } from "react";
import { pillButton } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { backendMessage, createReview, updateReview } from "@/lib/api";
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
}

// The review form: 1 to 5 stars and up to 500 characters. Writes a new
// review, or edits the traveler's own one when `existing` is given. The
// database checks everything again (see supabase/sql/020), so this form
// is about friendly messages, not about security.
export function ReviewForm({ placeType, placeId, onSaved, existing, onCancel }: ReviewFormProps) {
  const isEdit = !!existing;
  const [rating, setRating] = useState(existing?.rating ?? 0);
  // The star under the mouse, so the stars light up before clicking.
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState(existing?.comment ?? "");
  const [ratingError, setRatingError] = useState<string | null>(null);
  const [commentError, setCommentError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // The photo: a newly chosen file (ticket 81; when editing it replaces
  // the old one), and, when editing, whether the traveler removed the
  // photo the review already had (ticket 82).
  const [photo, setPhoto] = useState<File | null>(null);
  const [removeCurrent, setRemoveCurrent] = useState(false);

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
    try {
      const token = await loginToken();
      if (!token) {
        setFormError("Please log in again, then try again.");
        return;
      }
      const fields = { rating, comment: comment.trim() };
      // Both go to the NestJS backend with the traveler's login token:
      // editing (PATCH /v1/reviews/:id) changes only the stars and
      // comment; a new review (POST /v1/reviews) sends the place too, and
      // the database fills in who wrote it, their name and the dates.
      onSaved(
        isEdit
          ? await updateReview(token, existing.id, fields, { photo, removePhoto: removeCurrent })
          : await createReview(token, { place_type: placeType, place_id: placeId, ...fields }, photo),
      );
    } catch (error) {
      // The backend explains its refusals in plain words (for example
      // "You've already reviewed this place."); otherwise a general one.
      setFormError(backendMessage(error) ?? fallbackError);
    } finally {
      setBusy(false);
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
            photo={photo}
            onChange={setPhoto}
            disabled={busy}
            currentUrl={isEdit && !removeCurrent ? existing?.photo_url : null}
            onRemoveCurrent={() => setRemoveCurrent(true)}
          />

          <div className="flex flex-wrap items-center gap-3">
            {/* disabled while saving, so it cannot be sent twice. */}
            <button type="submit" disabled={busy} className={pillButton({ kind: "main" })}>
              {busy ? <Spinner /> : isEdit ? <Check aria-hidden="true" /> : <Send aria-hidden="true" />}
              {busy
                ? isEdit
                  ? "Saving…"
                  : "Posting…"
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
