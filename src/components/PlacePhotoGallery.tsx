"use client";

import { Camera, Maximize2 } from "lucide-react";
import { useRef, useState } from "react";
import type { PublicPlacePhoto } from "@/lib/api";
import { PhotoViewer } from "@/components/PhotoViewer";

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
// The viewer: clicking a tile opens it in the shared full-screen viewer
// (PhotoViewer.tsx: arrows at the middle of the screen's edges, "2 of 4"),
// with the photo's credit line at the bottom.
//
// The tiles fill their frames (object-cover) at full resolution
// (team request 2026-11-19), matching the admin dashboard's style.
// The viewer shows the whole photo (object-contain) so nothing is cropped.

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
  const [open, setOpen] = useState(0);
  const count = photos.length;
  if (count === 0) return null;
  const altOf = (index: number) => `Photo ${index + 1} of ${count} of ${placeName}`;

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
              {/* Original URL at full resolution (team request 2026-11-19):
                  no photoThumb resizing. Tiles fill their frames
                  (object-cover), matching the admin dashboard style. */}
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

      <PhotoViewer
        dialogRef={dialog}
        label={`Photos of ${placeName}`}
        photos={photos.map((item, index) => ({ id: item.id, url: item.url, alt: altOf(index) }))}
        index={open}
        onIndexChange={setOpen}
        caption={(_shown, index) => {
          const photo = photos[index];
          return (
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
          );
        }}
      />
    </>
  );
}
