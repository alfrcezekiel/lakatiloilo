"use client";

import { ImagePlus, X } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { pillButton } from "@/components/ui/button";
import { MAX_REVIEW_PHOTOS, type ReviewPhoto } from "@/lib/api";
import { fitPhoto, MAX_PHOTO_BYTES, PHOTO_TYPES } from "@/lib/shrink-photo";

// The photo rules live with the shrinking (src/lib/shrink-photo.ts); kept
// here too, for the other pickers that import them from this file.
export { MAX_PHOTO_BYTES, PHOTO_TYPES };
// Unchanged by the "photos over 2 MB" change (team request 2026-11-22):
// what is stored is still at most 2 MB.
export const PHOTO_MESSAGE = "Please choose a JPG, PNG or WebP photo up to 2 MB.";
export const TOO_MANY_PHOTOS = `A review can have up to ${MAX_REVIEW_PHOTOS} photos.`;

// "Add photos" in the review form (ticket 113; one photo since ticket 81):
// up to 4 photos in all, each JPG, PNG or WebP up to 2 MB, each with a
// preview and its own Remove button.
//
//   - `current`: photos the review already has (when editing). Remove
//     calls onRemoveCurrent; the form removes them when it is saved.
//   - `files`: photos chosen now, not uploaded yet. The form uploads them
//     one by one when it is saved.
//
// The browser checks the type, size and number first, so a wrong file
// gets a message at once without being uploaded; the backend, the Storage
// bucket and the database check everything again. A photo over 2 MB is
// made smaller in the browser first (fitPhoto, team request 2026-11-22).
export function ReviewPhotoPicker({
  current,
  onRemoveCurrent,
  files,
  onFilesChange,
  disabled,
}: {
  current: ReviewPhoto[];
  onRemoveCurrent: (id: string) => void;
  files: File[];
  onFilesChange: (files: File[]) => void;
  disabled?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const [error, setError] = useState<string | null>(null);
  // True while a photo over 2 MB is being made smaller.
  const [preparing, setPreparing] = useState(false);
  const total = current.length + files.length;
  const room = MAX_REVIEW_PHOTOS - total;

  // Temporary addresses for the chosen files, so they can be shown before
  // they are uploaded; released again when the files change or the form
  // closes.
  const previews = useMemo(() => files.map((file) => URL.createObjectURL(file)), [files]);
  useEffect(() => () => previews.forEach((url) => URL.revokeObjectURL(url)), [previews]);

  const choose = async (chosen: FileList | null) => {
    const picked = Array.from(chosen ?? []);
    if (picked.length === 0) return;
    // Lets the same file be chosen again after Remove.
    if (input.current) input.current.value = "";
    setError(null);
    setPreparing(true);
    // One at a time, so a phone never holds several big photos at once.
    const fitting: File[] = [];
    for (const file of picked) {
      const fitted = await fitPhoto(file);
      if (fitted) fitting.push(fitted);
    }
    setPreparing(false);
    const kept = fitting.slice(0, Math.max(room, 0));
    const messages: string[] = [];
    if (fitting.length < picked.length) {
      messages.push(
        picked.length === 1
          ? PHOTO_MESSAGE
          : `${picked.length - fitting.length} of them could not be added. ${PHOTO_MESSAGE}`,
      );
    }
    if (kept.length < fitting.length) messages.push(`${TOO_MANY_PHOTOS} Remove one to add another.`);
    setError(messages.length > 0 ? messages.join(" ") : null);
    if (kept.length > 0) onFilesChange([...files, ...kept]);
  };

  const removeButton = (label: string, onClick: () => void) => (
    <button
      type="button"
      onClick={() => {
        setError(null);
        onClick();
      }}
      disabled={disabled}
      aria-label={label}
      className={cn(pillButton({ kind: "glass" }), "h-9 w-full justify-center px-2 text-sm")}
    >
      <X aria-hidden="true" />
      Remove
    </button>
  );

  return (
    <div className="space-y-2">
      <input
        ref={input}
        id={inputId}
        type="file"
        multiple
        accept={PHOTO_TYPES.join(",")}
        className="sr-only"
        disabled={disabled || room <= 0 || preparing}
        onChange={(e) => void choose(e.target.files)}
      />

      {total > 0 && (
        <ul aria-label="Your photos" className="flex flex-wrap gap-3">
          {/* Numbered across both kinds, so "Remove photo 3" is the third
              one shown. */}
          {current.map((photo, index) => {
            const number = index + 1;
            return (
              <li key={photo.id} className="w-24 space-y-1.5 sm:w-28">
                <img
                  src={photo.url}
                  alt={`Your photo ${number}`}
                  className="size-24 rounded-lg border border-white/20 object-cover sm:size-28"
                />
                {removeButton(`Remove photo ${number}`, () => onRemoveCurrent(photo.id))}
              </li>
            );
          })}
          {files.map((file, index) => {
            const number = current.length + index + 1;
            return (
              <li key={previews[index]} className="w-24 space-y-1.5 sm:w-28">
                <img
                  src={previews[index]}
                  alt={`New photo ${number}, ${file.name}`}
                  className="size-24 rounded-lg border border-amber-300/60 object-cover sm:size-28"
                />
                {removeButton(`Remove photo ${number}`, () =>
                  onFilesChange(files.filter((_, i) => i !== index)),
                )}
              </li>
            );
          })}
        </ul>
      )}

      {room > 0 ? (
        // The visible "button" that opens the file chooser: a label for the
        // hidden file input, so it works with a click, a tap or the keyboard.
        <label
          htmlFor={inputId}
          className={cn(
            pillButton({ kind: "glass" }),
            "h-9 cursor-pointer px-3.5 text-sm has-focus-visible:outline-2 has-focus-visible:outline-white",
            disabled && "pointer-events-none opacity-60",
          )}
        >
          <ImagePlus aria-hidden="true" />
          {total === 0 ? "Add photos" : "Add more photos"}
          <span className="font-normal text-white/70">
            ({total} of {MAX_REVIEW_PHOTOS}
            {total === 0 ? ", optional" : ""})
          </span>
        </label>
      ) : (
        <p className="text-sm text-white/75">{MAX_REVIEW_PHOTOS} of {MAX_REVIEW_PHOTOS} photos. Remove one to add another.</p>
      )}

      {preparing && (
        <p role="status" className="text-sm text-white/85">
          Making your photo smaller…
        </p>
      )}

      {error && (
        <p role="alert" className="text-sm text-amber-200">
          {error}
        </p>
      )}
    </div>
  );
}
