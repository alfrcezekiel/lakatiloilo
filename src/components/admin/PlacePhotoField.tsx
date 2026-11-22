"use client";

import { ImagePlus, X } from "lucide-react";
import { useEffect, useMemo, useState, type RefObject } from "react";
import { PHOTO_MESSAGE, PHOTO_TYPES } from "@/components/ReviewPhotoPicker";
import { fitPhoto } from "@/lib/shrink-photo";
import { cn } from "@/lib/utils";

// A place's photo on the Edit and Add forms (full admin management round,
// ticket 119): the current one, or the new one chosen from the computer
// (JPG, PNG or WebP; over 2 MB it is made smaller first) with a preview, "Choose a photo" and
// Remove. The form keeps the chosen file and uploads it on Save. Moved out
// of AdminPlaceEdit.tsx in the code review of 2026-11-11.
export function PlacePhotoField({
  photo,
  onPhoto,
  error,
  onError,
  currentUrl,
  placeName,
  adding,
  busy,
  inputRef,
}: {
  photo: File | null;
  onPhoto: (file: File | null) => void;
  error: string | null;
  onError: (message: string | null) => void;
  currentUrl: string | null;
  placeName: string;
  adding: boolean;
  busy: boolean;
  // The form focuses it when a new place has no photo yet.
  inputRef: RefObject<HTMLInputElement | null>;
}) {
  const preview = useMemo(() => (photo ? URL.createObjectURL(photo) : null), [photo]);
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );
  // True while a photo over 2 MB is being made smaller (team request
  // 2026-11-22, src/lib/shrink-photo.ts).
  const [preparing, setPreparing] = useState(false);
  const choosePhoto = async (file: File | undefined) => {
    if (!file) return;
    // Lets the same file be chosen again after Remove.
    if (inputRef.current) inputRef.current.value = "";
    onError(null);
    setPreparing(true);
    const fitted = await fitPhoto(file);
    setPreparing(false);
    if (fitted) onPhoto(fitted);
    else onError(PHOTO_MESSAGE);
  };

  return (
    <div className="space-y-2">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-white/80">Photo</p>
      <div className="flex flex-wrap items-end gap-3">
        {(preview ?? currentUrl) && (
          <img
            src={preview ?? currentUrl ?? undefined}
            alt={
              preview
                ? "Preview of the new photo you chose"
                : `The current photo of ${placeName}`
            }
            className={cn(
              "h-36 w-56 max-w-full rounded-xl border object-cover",
              preview ? "border-amber-300/70" : "border-white/25",
            )}
          />
        )}
        <input
          ref={inputRef}
          id="place-photo"
          type="file"
          accept={PHOTO_TYPES.join(",")}
          className="sr-only"
          disabled={busy || preparing}
          aria-invalid={!!error}
          aria-describedby="place-photo-help"
          onChange={(e) => void choosePhoto(e.target.files?.[0])}
        />
        <div className="flex flex-wrap gap-2">
          {/* A label for the hidden file input, so it works with a click,
              a tap or the keyboard. */}
          <label
            htmlFor="place-photo"
            className={cn(
              "inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-white/50 px-4 text-sm font-semibold hover:border-amber-300 hover:text-amber-300 has-focus-visible:outline-2 has-focus-visible:outline-white",
              busy && "pointer-events-none opacity-60",
            )}
          >
            <ImagePlus aria-hidden="true" className="size-4" />
            {photo ? "Choose another photo" : "Choose a photo"}
          </label>
          {photo && (
            <button
              type="button"
              onClick={() => onPhoto(null)}
              disabled={busy}
              className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-white/50 px-4 text-sm font-semibold hover:border-amber-300 hover:text-amber-300 focus-visible:outline-2 focus-visible:outline-white disabled:opacity-60"
            >
              <X aria-hidden="true" className="size-4" />
              {adding ? "Remove this photo" : "Keep the current photo"}
            </button>
          )}
        </div>
      </div>
      <p role={preparing ? "status" : undefined} className="text-xs text-white/70">
        {preparing
          ? "Making the photo smaller…"
          : photo
          ? adding
            ? `Photo: ${photo.name}.`
            : `New photo: ${photo.name}. It replaces the current one when you save.`
          : adding
            ? "Needed. JPG, PNG or WebP from your computer; over 2 MB is made smaller for you."
            : "JPG, PNG or WebP from your computer; over 2 MB is made smaller for you."}
      </p>
      {error && (
        <p id="place-photo-help" role="alert" className="text-sm font-medium text-amber-200">
          {error}
        </p>
      )}
    </div>
  );
}
