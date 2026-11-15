"use client";

import { Camera, ChevronLeft, ChevronRight, Maximize2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { PublicPlacePhoto } from "@/lib/api";
import { cn } from "@/lib/utils";
import { pillButton } from "@/components/ui/button";

// A place's other photos on its page (admin extras round, ticket 146; its
// own design and viewer since the team's requests of 2026-11-13).
//
// The section: a mosaic. One photo is a wide tile; two are two halves; three
// or more put the first large (two columns by two rows from 640 px) with the
// others as squares beside and under it. On phones the first spans the full
// width and the rest go two per row. Each tile shows the photographer's
// credit on a soft dark fade at its foot, and an "enlarge" mark on hover or
// keyboard focus.
//
// The viewer: clicking a tile opens it in a viewer that fills the screen
// (the browser's own <dialog>: Escape closes it and the focus goes back to
// the tile that opened it):
//   - the photo shows at the size it was uploaded, only made smaller when
//     it is bigger than the screen, never stretched;
//   - Previous and Next stay fixed at the middle of the screen's left and
//     right edges; the photo keeps clear of them. The first photo has no
//     Previous and the last no Next (no going round; team request
//     2026-11-13), and the arrow keys follow the same rule. When an arrow
//     with the keyboard focus goes, the focus moves to the other one;
//   - "2 of 4" and the photo's credit line sit at the bottom of the screen.
// Close and a click on the dark area around the photo also close it.

// The tile's shape in the mosaic, by its place in the list, so the mosaic
// never leaves a gap (2 columns on phones, 4 from 640 px):
//   1 photo: one wide tile; 2: two halves;
//   3: the first large, the other two wide tiles stacked beside it;
//   4: the first large, two squares, and the last one wide under them;
//   5: the first large, four squares around it.
function tileClass(index: number, count: number) {
  if (count === 1) return "col-span-2 aspect-video sm:col-span-4 sm:aspect-21/9";
  if (count === 2) return "col-span-2 aspect-video sm:aspect-4/3";
  if (index === 0) return "col-span-2 aspect-video sm:row-span-2 sm:aspect-auto";
  if (count === 3) return "aspect-square sm:col-span-2 sm:aspect-video";
  if (count === 4 && index === count - 1) return "col-span-2 aspect-video sm:aspect-auto";
  return "aspect-square";
}

export function PlacePhotoGallery({ photos, placeName }: { photos: PublicPlacePhoto[]; placeName: string }) {
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
  const count = photos.length;
  if (count === 0) return null;
  const current = Math.min(open, count - 1);
  const photo = photos[current];
  const altOf = (index: number) => `Photo ${index + 1} of ${count} of ${placeName}`;
  const hasPrevious = current > 0;
  const hasNext = current < count - 1;
  // Moves one photo, never past the first or the last. Reaching an end hides
  // that arrow (team request 2026-11-13); if it had the keyboard focus, the
  // focus moves to the arrow still shown, so it is never lost.
  const go = (step: number) => {
    const next = Math.min(Math.max(current + step, 0), count - 1);
    const focused = document.activeElement;
    if (next === 0 && focused === previousButton.current) focusAfterMove.current = "next";
    if (next === count - 1 && focused === nextButton.current) focusAfterMove.current = "previous";
    setOpen(next);
  };
  const close = () => dialog.current?.close();

  // Fixed at the middle of the screen's left or right edge; not shown at
  // the first photo (Previous) or the last (Next).
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
      <ul
        aria-label={`Photos of ${placeName}`}
        className="grid grid-cols-2 gap-2 sm:auto-rows-fr sm:grid-cols-4 sm:gap-3"
      >
        {photos.map((item, index) => (
          <li key={item.id} className={tileClass(index, count)}>
            <button
              type="button"
              onClick={() => {
                setOpen(index);
                dialog.current?.showModal();
              }}
              aria-label={`${altOf(index)}, open larger`}
              className="group relative block size-full cursor-zoom-in overflow-hidden rounded-2xl border border-white/15 bg-white/5 text-left transition-colors hover:border-white/45 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <img
                src={item.url}
                alt=""
                loading="lazy"
                className="absolute inset-0 size-full object-cover transition-transform duration-500 ease-out motion-safe:group-hover:scale-105 motion-safe:group-focus-visible:scale-105"
              />
              {/* The "enlarge" mark, on hover or keyboard focus. */}
              <span
                aria-hidden="true"
                className="absolute top-2 right-2 flex size-8 items-center justify-center rounded-full bg-black/55 text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
              >
                <Maximize2 className="size-4" />
              </span>
              {/* The photographer's credit on a soft fade at the foot. */}
              <span
                aria-hidden="true"
                className="absolute inset-x-0 bottom-0 flex items-end gap-1.5 bg-linear-to-t from-black/75 via-black/30 to-transparent px-3 pt-8 pb-2.5 text-[0.6875rem] leading-snug font-medium text-white/90 sm:text-xs"
              >
                <Camera className="mt-px size-3.5 shrink-0" />
                <span className="line-clamp-1 wrap-anywhere">{item.credit_line}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>

      <dialog
        ref={dialog}
        aria-label={`Photos of ${placeName}`}
        // The visible area (size-full, not w-screen: with a scrollbar on the
        // page behind, w-screen pushed the right arrow over the photo).
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
              screen). With more than one photo it keeps clear of the
              arrows at the screen's edges (the side padding). */}
          <div
            className={cn(
              "flex min-h-0 flex-1 items-center justify-center",
              count > 1 ? "px-14 sm:px-24" : "px-2 sm:px-4",
            )}
            onClick={(e) => {
              if (e.target === e.currentTarget) close();
            }}
          >
            <img
              key={photo.id}
              src={photo.url}
              alt={altOf(current)}
              className="block h-auto max-h-[calc(100dvh-9.5rem)] w-auto max-w-full rounded-xl object-contain"
            />
          </div>
          {hasPrevious && arrow("previous")}
          {hasNext && arrow("next")}

          {/* At the bottom of the screen: where you are (read out when it
              changes) and the photo's credit line. */}
          <div className="space-y-1 px-4 pt-3 pb-5 text-center">
            {count > 1 && (
              <p aria-live="polite" className="text-sm font-semibold">
                {current + 1} of {count}
              </p>
            )}
            <p className="text-sm wrap-anywhere text-white/85">
              {photo.source_url ? (
                <a
                  href={photo.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline decoration-white/40 underline-offset-2 hover:text-amber-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                  {photo.credit_line}
                  <span className="sr-only"> (opens the original photo in a new tab)</span>
                </a>
              ) : (
                photo.credit_line
              )}
            </p>
          </div>
        </div>
      </dialog>
    </>
  );
}
