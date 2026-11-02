"use client";

import { ImagePlus, X } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { pillButton } from "@/components/ui/button";

export const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const MAX_PHOTO_BYTES = 2 * 1024 * 1024; // 2 MB, the same as the bucket (027)
export const PHOTO_MESSAGE = "Please choose a JPG, PNG or WebP photo up to 2 MB.";

// "Add a photo" in the review form (review extras round, ticket 81): one
// photo, JPG, PNG or WebP, up to 2 MB, with a preview and a Remove button.
// The browser checks the type and size first, so a wrong file gets the
// message at once without being uploaded; the backend and the Storage
// bucket check everything again.
//
// Editing a review that has a photo (ticket 82): `currentUrl` shows that
// photo with "Change photo" (choose a new one, which replaces it) and
// "Remove photo" (`onRemoveCurrent`). Choosing a new photo and then
// removing it goes back to the current one.
export function ReviewPhotoPicker({
  photo,
  onChange,
  disabled,
  currentUrl,
  onRemoveCurrent,
}: {
  photo: File | null;
  onChange: (photo: File | null) => void;
  disabled?: boolean;
  currentUrl?: string | null;
  onRemoveCurrent?: () => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const [error, setError] = useState<string | null>(null);

  // A temporary address for the chosen file, so it can be shown before it
  // is uploaded. Worked out from the photo itself, and released again when
  // the photo changes or the form closes.
  const preview = useMemo(() => (photo ? URL.createObjectURL(photo) : null), [photo]);
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );

  const choose = (file: File | undefined) => {
    if (!file) return;
    if (!PHOTO_TYPES.includes(file.type) || file.size > MAX_PHOTO_BYTES) {
      setError(PHOTO_MESSAGE);
      onChange(null);
    } else {
      setError(null);
      onChange(file);
    }
    // Lets the same file be chosen again after Remove.
    if (input.current) input.current.value = "";
  };

  // The visible "button" that opens the file chooser: a label for the
  // hidden file input, so it works with a click, a tap or the keyboard.
  const chooseButton = (text: string, optional = false) => (
    <label
      htmlFor={inputId}
      className={cn(
        pillButton({ kind: "glass" }),
        "h-9 cursor-pointer px-3.5 text-sm has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-white",
        disabled && "pointer-events-none opacity-60",
      )}
    >
      <ImagePlus aria-hidden="true" />
      {text}
      {optional && <span className="font-normal text-white/70">(optional)</span>}
    </label>
  );

  return (
    <div className="space-y-2">
      <input
        ref={input}
        id={inputId}
        type="file"
        accept={PHOTO_TYPES.join(",")}
        className="sr-only"
        disabled={disabled}
        onChange={(e) => choose(e.target.files?.[0])}
      />
      {preview ? (
        <div className="flex flex-wrap items-end gap-3">
          <img
            src={preview}
            alt="Preview of the photo you chose"
            className="h-28 w-auto max-w-full rounded-lg border border-white/20 object-cover"
          />
          <button
            type="button"
            onClick={() => onChange(null)}
            disabled={disabled}
            className={cn(pillButton({ kind: "glass" }), "h-9 px-3.5 text-sm")}
          >
            <X aria-hidden="true" />
            Remove photo
          </button>
        </div>
      ) : currentUrl ? (
        <div className="flex flex-wrap items-end gap-3">
          <img
            src={currentUrl}
            alt="Your review's photo"
            className="h-28 w-auto max-w-full rounded-lg border border-white/20 object-cover"
          />
          <div className="flex flex-wrap gap-2">
            {chooseButton("Change photo")}
            <button
              type="button"
              onClick={onRemoveCurrent}
              disabled={disabled}
              className={cn(pillButton({ kind: "glass" }), "h-9 px-3.5 text-sm")}
            >
              <X aria-hidden="true" />
              Remove photo
            </button>
          </div>
        </div>
      ) : (
        chooseButton("Add a photo", true)
      )}
      {error && (
        <p role="alert" className="text-sm text-amber-200">
          {error}
        </p>
      )}
    </div>
  );
}
