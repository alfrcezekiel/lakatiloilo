"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useEffect, useRef, type ReactNode, type RefObject } from "react";
import { cn } from "@/lib/utils";
import { pillButton } from "@/components/ui/button";

// The full-screen photo viewer shared by a place's Photos gallery
// (PlacePhotoGallery, from the team's requests of 2026-11-13) and a
// review's photos (ReviewPhotos, team request 2026-11-28). One copy, so a
// fix to one viewer reaches both (code review 2026-11-28).
//
// The browser's own <dialog>: the parent keeps a ref to it and opens it
// with showModal(); Escape closes it and the focus goes back to the
// thumbnail that opened it.
//   - the photo shows at the size it was uploaded, only made smaller when
//     it is bigger than the screen, never stretched;
//   - with more than one photo, Previous and Next stay fixed at the middle
//     of the screen's left and right edges; the photo keeps clear of them.
//     The first photo has no Previous and the last no Next (no going
//     round; team request 2026-11-13), and the arrow keys follow the same
//     rule. When an arrow with the keyboard focus goes, the focus moves to
//     the other one;
//   - "2 of 4" sits at the bottom of the screen (read out by screen readers
//     when it changes), with the optional `caption` under it (the gallery's
//     credit line; review photos have none).
// Close and a click on the dark area around the photo also close it.

export type ViewerPhoto = { id: string; url: string; alt: string };

export function PhotoViewer({
  dialogRef,
  label,
  photos,
  index,
  onIndexChange,
  caption,
}: {
  dialogRef: RefObject<HTMLDialogElement | null>;
  // Read out as the viewer's name, for example "Photos of Garin Farm".
  label: string;
  photos: ViewerPhoto[];
  // The photo shown; the parent sets it before opening the viewer.
  index: number;
  onIndexChange: (index: number) => void;
  // Shown at the bottom, under "2 of 4", for the photo on screen.
  caption?: (photo: ViewerPhoto, index: number) => ReactNode;
}) {
  const previousButton = useRef<HTMLButtonElement>(null);
  const nextButton = useRef<HTMLButtonElement>(null);
  // The arrow to give the focus to once the screen shows the new photo
  // (the one that had it may be gone, at the first or last photo).
  const focusAfterMove = useRef<"previous" | "next" | null>(null);
  useEffect(() => {
    const target = focusAfterMove.current;
    focusAfterMove.current = null;
    if (target === "previous") previousButton.current?.focus();
    if (target === "next") nextButton.current?.focus();
  }, [index]);

  const count = photos.length;
  if (count === 0) return null;
  // Kept inside the list if a photo was removed while the viewer was open.
  const current = Math.min(index, count - 1);
  const photo = photos[current];
  const many = count > 1;
  const hasPrevious = current > 0;
  const hasNext = current < count - 1;
  // Moves one photo, never past the first or the last.
  const go = (step: number) => {
    const next = Math.min(Math.max(current + step, 0), count - 1);
    const focused = document.activeElement;
    if (next === 0 && focused === previousButton.current) focusAfterMove.current = "next";
    if (next === count - 1 && focused === nextButton.current) focusAfterMove.current = "previous";
    onIndexChange(next);
  };
  const close = () => dialogRef.current?.close();
  const closeOnDarkArea = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) close();
  };

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
    <dialog
      ref={dialogRef}
      aria-label={label}
      // The visible area (size-full, not w-screen: with a scrollbar on the
      // page behind, w-screen pushed the right arrow over the photo).
      onClick={closeOnDarkArea}
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
      <div className="flex h-full flex-col" onClick={closeOnDarkArea}>
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
          onClick={closeOnDarkArea}
        >
          <img
            key={photo.id}
            src={photo.url}
            alt={photo.alt}
            className="block h-auto max-h-[calc(100dvh-9.5rem)] w-auto max-w-full rounded-xl object-contain"
          />
        </div>
        {hasPrevious && arrow("previous")}
        {hasNext && arrow("next")}

        <div className="space-y-1 px-4 pt-3 pb-5 text-center">
          {many && (
            <p aria-live="polite" className="text-sm font-semibold">
              {current + 1} of {count}
            </p>
          )}
          {caption?.(photo, current)}
        </div>
      </div>
    </dialog>
  );
}
