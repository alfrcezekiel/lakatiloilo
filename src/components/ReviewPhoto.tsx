"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { pillButton } from "@/components/ui/button";

// A review's photos (review extras round, ticket 81; up to four since
// ticket 113; the gallery since ticket 114).
//
// Under the review they show as a row of small squares. Clicking one opens
// it larger in a pop-up (the browser's own <dialog>, so Escape closes it
// and the focus goes back to the square that opened it). With more than
// one photo the pop-up has Previous and Next buttons, the left and right
// arrow keys do the same, and "2 of 4" says where you are (read out by
// screen readers too). Going past the last photo starts again at the
// first. Close and a click on the dim background also close it.
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
  const [open, setOpen] = useState(0);

  if (!photos || photos.length === 0) return null;
  const count = photos.length;
  const many = count > 1;
  const altOf = (index: number) =>
    many
      ? `Photo ${index + 1} of ${count} from ${reviewerName}'s review`
      : `Photo from ${reviewerName}'s review`;

  // The photo being shown, kept inside the list if a photo was removed
  // while the pop-up was open.
  const current = Math.min(open, count - 1);
  const go = (step: number) => setOpen((current + step + count) % count);

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
              className="block cursor-zoom-in overflow-hidden rounded-lg border border-white/20 transition-colors hover:border-white/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              aria-label={`${altOf(index)}, open larger`}
            >
              <img src={photo.url} alt="" loading="lazy" className="size-24 object-cover sm:size-28" />
            </button>
          </li>
        ))}
      </ul>

      <dialog
        ref={dialog}
        aria-label={`Photos from ${reviewerName}'s review`}
        // A click on the dim background (the dialog itself, not the photo
        // or the buttons) closes it.
        onClick={(e) => {
          if (e.target === dialog.current) dialog.current?.close();
        }}
        onKeyDown={(e) => {
          if (!many) return;
          if (e.key === "ArrowRight") {
            e.preventDefault();
            go(1);
          } else if (e.key === "ArrowLeft") {
            e.preventDefault();
            go(-1);
          }
        }}
        className="m-auto max-h-[95vh] w-[min(56rem,calc(100%-2rem))] overflow-visible bg-transparent p-0 text-white backdrop:bg-black/80"
      >
        <div className="flex flex-col items-center gap-3">
          <div className="flex w-full justify-end">
            <button
              type="button"
              onClick={() => dialog.current?.close()}
              className={cn(pillButton({ kind: "glass" }), "h-10 px-4 text-sm")}
            >
              <X aria-hidden="true" />
              Close
            </button>
          </div>

          <img
            key={photos[current].id}
            src={photos[current].url}
            alt={altOf(current)}
            className="max-h-[72vh] w-auto max-w-full rounded-xl object-contain"
          />

          {many && (
            <div className="flex w-full items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => go(-1)}
                className={cn(pillButton({ kind: "glass" }), "h-11 px-4 text-sm")}
              >
                <ChevronLeft aria-hidden="true" />
                Previous
              </button>
              {/* Read out when it changes, so screen reader users hear
                  which photo they are on. */}
              <p aria-live="polite" className="text-sm font-semibold">
                {current + 1} of {count}
              </p>
              <button
                type="button"
                onClick={() => go(1)}
                className={cn(pillButton({ kind: "glass" }), "h-11 px-4 text-sm")}
              >
                Next
                <ChevronRight aria-hidden="true" />
              </button>
            </div>
          )}
        </div>
      </dialog>
    </>
  );
}
