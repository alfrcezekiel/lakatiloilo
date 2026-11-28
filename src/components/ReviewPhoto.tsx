"use client";

import { useRef, useState } from "react";
import { reviewPhotoThumb } from "@/lib/photo-url";
import { PhotoViewer } from "@/components/PhotoViewer";

// A review's photos (review extras round, ticket 81; up to four since
// ticket 113; the gallery since ticket 114).
//
// Under the review they show in equal square frames, regardless of whether
// the source is portrait or landscape. The whole photo fits without cropping.
//
// The viewer (team request 2026-11-28): clicking a photo opens it in the
// same full-screen viewer as a place's Photos gallery (PhotoViewer.tsx:
// arrows at the middle of the screen's left and right edges, "2 of 4" at
// the bottom), without a credit line, because review photos are the
// traveler's own. One photo shows no arrows and no count.
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
  const altOf = (index: number) =>
    count > 1
      ? `Photo ${index + 1} of ${count} from ${reviewerName}'s review`
      : `Photo from ${reviewerName}'s review`;

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

      <PhotoViewer
        dialogRef={dialog}
        label={`Photos from ${reviewerName}'s review`}
        photos={photos.map((photo, index) => ({ id: photo.id, url: photo.url, alt: altOf(index) }))}
        index={open}
        onIndexChange={setOpen}
      />
    </>
  );
}
