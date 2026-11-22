"use client";

import { Film, X } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { pillButton } from "@/components/ui/button";
import { checkVideo, VIDEO_ACCEPT } from "@/lib/review-video";

// A review's video, in the review (ticket 165). It never plays by itself
// and downloads nothing until the traveler presses play (preload="none");
// on a phone it plays inside the page (playsInline). A video this browser
// can't play (for example an iPhone MOV in a browser without HEVC) says so
// instead of showing a broken box.
export function ReviewVideo({ url, reviewerName }: { url: string | null | undefined; reviewerName: string }) {
  const [failed, setFailed] = useState(false);
  if (!url) return null;
  if (failed) {
    return (
      <p className="rounded-lg border border-white/20 px-3 py-2 text-sm text-white/85">
        This video can&apos;t play in this browser.
      </p>
    );
  }
  return (
    <video
      src={url}
      controls
      preload="none"
      playsInline
      onError={() => setFailed(true)}
      aria-label={`Video from ${reviewerName}'s review`}
      className="aspect-video w-full max-w-xl rounded-lg border border-white/20 bg-black"
    />
  );
}

// "Add a video" in the review form (ticket 165): one MP4, MOV or WebM, up
// to 50 MB and 60 seconds, checked in the browser as soon as it is chosen,
// with a small preview and Remove. The form uploads it when the review is
// saved. Changing or removing a video already saved comes with ticket 166.
export function ReviewVideoPicker({
  file,
  onFileChange,
  hasSavedVideo,
  disabled,
}: {
  file: File | null;
  onFileChange: (file: File | null) => void;
  hasSavedVideo: boolean;
  disabled?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  if (hasSavedVideo && !file) {
    return <p className="text-sm text-white/80">Your review has a video.</p>;
  }

  const choose = async (chosen: File | undefined) => {
    if (input.current) input.current.value = "";
    if (!chosen) return;
    setError(null);
    setChecking(true);
    const message = await checkVideo(chosen);
    setChecking(false);
    if (message) setError(message);
    else onFileChange(chosen);
  };

  return (
    <div className="space-y-2">
      <input
        ref={input}
        id={inputId}
        type="file"
        accept={VIDEO_ACCEPT}
        className="sr-only"
        disabled={disabled || checking}
        onChange={(e) => void choose(e.target.files?.[0])}
      />
      {preview && file ? (
        <div className="w-full max-w-xs space-y-1.5">
          <video
            src={preview}
            controls
            muted
            playsInline
            preload="metadata"
            aria-label={`Preview of your video, ${file.name}`}
            className="aspect-video w-full rounded-lg border border-amber-300/60 bg-black"
          />
          <button
            type="button"
            onClick={() => {
              setError(null);
              onFileChange(null);
            }}
            disabled={disabled}
            className={cn(pillButton({ kind: "glass" }), "h-9 w-full justify-center px-2 text-sm")}
          >
            <X aria-hidden="true" />
            Remove video
          </button>
        </div>
      ) : (
        // A label for the hidden file input, so it works with a click, a tap
        // or the keyboard (the same way as Add photos).
        <label
          htmlFor={inputId}
          className={cn(
            pillButton({ kind: "glass" }),
            "h-9 cursor-pointer px-3.5 text-sm has-focus-visible:outline-2 has-focus-visible:outline-white",
            (disabled || checking) && "pointer-events-none opacity-60",
          )}
        >
          <Film aria-hidden="true" />
          Add a video
          <span className="font-normal text-white/70">(optional, up to 60 s)</span>
        </label>
      )}
      {checking && (
        <p role="status" className="text-sm text-white/85">
          Checking your video…
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
