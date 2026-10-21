"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import type { Review } from "@/components/ReviewsSection";

const MAX_COMMENT = 500;
const ratingWords = ["", "Poor", "Fair", "Good", "Very good", "Excellent"];

// When the database refuses a review it answers with a code. These turn
// the ones travelers can hit into plain sentences.
const dbErrors: Record<string, string> = {
  // The one-review-per-place rule (the "unique" line in supabase/sql/020).
  "23505": "You've already reviewed this place.",
  // Not logged in any more (for example, logged out in another tab).
  "42501": "Please log in again, then try again.",
  PGRST301: "Please log in again, then try again.",
  // A rating or comment outside the limits.
  "23514": "Please pick 1 to 5 stars and write 1 to 500 characters.",
  // Editing found no review this account may change (Row Level Security),
  // for example after logging out in another tab.
  PGRST116: "We couldn't save your changes. Please log in again and try.",
};
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
      const reviews = createClient().from("reviews");
      const columns = "id, user_id, reviewer_name, rating, comment, created_at";
      const fields = { rating, comment: comment.trim() };
      // New review: only the place, stars and comment are sent; the
      // database fills in who wrote it, their name and the dates.
      // Editing: only the stars and comment can change (see the "grant
      // update" line in supabase/sql/020).
      const { data, error } = isEdit
        ? await reviews.update(fields).eq("id", existing.id).select(columns).single()
        : await reviews
            .insert({ place_type: placeType, place_id: placeId, ...fields })
            .select(columns)
            .single();
      if (error) {
        setFormError(dbErrors[error.code] ?? fallbackError);
        return;
      }
      onSaved(data);
    } catch {
      setFormError(fallbackError);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="bg-white/15 backdrop-blur-md border border-white/25 text-white">
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

          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="submit"
              disabled={busy}
              className="h-11 rounded-full bg-white px-6 font-semibold text-teal-900 hover:bg-white/90 hover:opacity-100"
            >
              {busy && <Spinner />}
              {busy
                ? isEdit
                  ? "Saving…"
                  : "Posting…"
                : isEdit
                  ? "Save changes"
                  : "Post review"}
            </Button>
            {isEdit && (
              <button
                type="button"
                onClick={onCancel}
                disabled={busy}
                className="h-11 rounded-full border border-white/40 px-6 text-sm font-semibold text-white hover:bg-white/10"
              >
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

// A small turning circle while Supabase answers. Stays still for visitors
// who turned on "reduce motion".
function Spinner() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4 motion-safe:animate-spin" fill="none">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
