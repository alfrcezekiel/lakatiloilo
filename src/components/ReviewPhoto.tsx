"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { reviewPhotoThumb } from "@/lib/photo-url";
import { cn } from "@/lib/utils";
import { pillButton } from "@/components/ui/button";

// A review's photos (review extras round, ticket 81; up to four since
// ticket 113; the gallery since ticket 114).
//
// Under the review they show in equal square frames, regardless of whether
// the source is portrait or landscape. The whole photo fits without cropping.
//
// The viewer (team request 2026-11-28: the same viewer as a place's Photos
// gallery, PlacePhotoGallery.tsx, without a credit line, because review
// photos are the traveler's own): clicking a photo opens it in a viewer
// that fills the screen (the browser's own <dialog>: Escape closes it and
// the focus goes back to the photo that opened it):
//   - the photo shows at the size it was uploaded, only made smaller when
//     it is bigger than the screen, never stretched;
//   - with 2 to 4 photos, Previous and Next arrows stay fixed at the middle
//     of the screen's left and right edges; the photo keeps clear of them.
//     The first photo has no Previous and the last no Next (no going
//     round, like the gallery), and the arrow keys follow the same rule.
//     When an arrow with the keyboard focus goes, the focus moves to the
//     other one;
//   - "2 of 4" sits at the bottom of the screen (read out by screen
//     readers when it changes). One photo shows no arrows and no count.
// Close and a click on the dark area around the photo also close it.
//
// Used under reviews on place pages, on traveler profiles and on the
// team's Reports screen. Everyone can see review photos.
export function ReviewPhotos({
  photos,
  reviewerName,
}: {
  photos: { id: string; url: string }[] | undefined;
  reviewerName: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const previousButton = useRef<HTMLButtonElement>(null);
  const nextButton = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(0);
  // The arrow to give the focus to once the screen shows the new photo
  // (the one that had it may be gone, at the first or last photo).
  const focusAfterMove = useRef<"previous" | "next" | null>(null);
  useEffect(() => {
    const target = focusAfterMove.current;
    focusAfterMove.current = null;
    if (target === "previous") previousButton.current?.focus();
    if (target === "next") nextButton.current?.focus();
  }, [open]);

  if (!photos || photos.length === 0) return null;
  const count = photos.length;
  const many = count > 1;
  const altOf = (index: number) =>
    many
      ? `Photo ${index + 1} of ${count} from ${reviewerName}'s review`
      : `Photo from ${reviewerName}'s review`;

  // The photo being shown, kept inside the list if a photo was removed
  // while the viewer was open.
  const current = Math.min(open, count - 1);
  const hasPrevious = current > 0;
  const hasNext = current < count - 1;
  // Moves one photo, never past the first or the last.
  const go = (step: number) => {
    const next = Math.min(Math.max(current + step, 0), count - 1);
    const focused = document.activeElement;
    if (next === 0 && focused === previousButton.current) focusAfterMove.current = "next";
    if (next === count - 1 && focused === nextButton.current) focusAfterMove.current = "previous";
    setOpen(next);
  };
  const close = () => dialog.current?.close();

  // Fixed at the middle of the screen's left or right edge, like the
  // gallery's arrows.
  const arrow = (side: "previous" | "next") => {
    const Icon = side === "previous" ? ChevronLeft : ChevronRight;
    return (
      <button
        ref={side === "previous" ? previousButton : nextButton}
        type="button"
        onClick={() => go(side === "previous" ? -1 : 1)}
        aria-label={side === "previous" ? "Previous photo" : "Next photo"}
        className={cn(
          "fixed top-1/2 z-10 flex size-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-white/40 bg-black/60 text-white hover:border-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:size-14",
          side === "previous" ? "left-2 sm:left-5" : "right-2 sm:right-5",
        )}
      >
        <Icon aria-hidden="true" className="size-6 sm:size-7" />
      </button>
    );
  };

  return (
    <>
      <ul aria-label={`Photos from ${reviewerName}'s review`} className="flex flex-wrap gap-2">
        {photos.map((photo, index) => (
          <li key={photo.id}>
            <button
              type="button"
              onClick={() => {
                setOpen(index);
                dialog.current?.showModal();
              }}
              className="flex size-28 shrink-0 cursor-zoom-in items-center justify-center overflow-hidden rounded-lg border border-white/20 transition-colors hover:border-white/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              aria-label={`${altOf(index)}, open larger`}
            >
              <img
                src={reviewPhotoThumb(photo.url)}
                alt=""
                loading="lazy"
                className="size-full object-contain"
              />
            </button>
          </li>
        ))}
      </ul>

      <dialog
        ref={dialog}
        aria-label={`Photos from ${reviewerName}'s review`}
        // The visible area (size-full, not w-screen, as in the gallery).
        // A click on the dark area (not the photo or a button) closes it.
        onClick={(e) => {
          if (e.target === e.currentTarget) close();
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight" && hasNext) {
            e.preventDefault();
            go(1);
          } else if (e.key === "ArrowLeft" && hasPrevious) {
            e.preventDefault();
            go(-1);
          }
        }}
        className="fixed inset-0 m-0 size-full max-h-none max-w-none bg-transparent p-0 text-white backdrop:bg-black/90"
      >
        <div
          className="flex h-full flex-col"
          onClick={(e) => {
            if (e.target === e.currentTarget) close();
          }}
        >
          <div className="flex justify-end p-3 sm:p-4">
            <button type="button" onClick={close} className={cn(pillButton({ kind: "glass" }), "h-11 px-4 text-sm")}>
              <X aria-hidden="true" />
              Close
            </button>
          </div>

          {/* The photo in the middle, at its own size (never bigger than the
              screen). With more than one photo it keeps clear of the arrows
              at the screen's edges (the side padding). */}
          <div
            className={cn(
              "flex min-h-0 flex-1 items-center justify-center",
              many ? "px-14 sm:px-24" : "px-2 sm:px-4",
            )}
            onClick={(e) => {
              if (e.target === e.currentTarget) close();
            }}
          >
            <img
              key={photos[current].id}
              src={photos[current].url}
              alt={altOf(current)}
              className="block h-auto max-h-[calc(100dvh-9.5rem)] w-auto max-w-full rounded-xl object-contain"
            />
          </div>
          {hasPrevious && arrow("previous")}
          {hasNext && arrow("next")}

          {/* At the bottom of the screen: where you are, read out when it
              changes. No credit line: the photo is the traveler's own. */}
          <div className="px-4 pt-3 pb-5 text-center">
            {many && (
              <p aria-live="polite" className="text-sm font-semibold">
                {current + 1} of {count}
              </p>
            )}
          </div>
        </div>
      </dialog>
    </>
  );
}
