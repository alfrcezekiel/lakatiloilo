"use client";

import { Film, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { pillButton } from "@/components/ui/button";
import { checkVideo, VIDEO_ACCEPT } from "@/lib/review-video";
import { useObjectUrl } from "@/lib/object-url";

// A review's video, in the review (ticket 165). It never plays by itself;
// on a phone it plays inside the page (playsInline). A video this browser
// can't play (for example an iPhone MOV in a browser without HEVC) says so
// instead of showing a broken box.
//
// Thumbnail (team request 2026-11-22): the player shows the video's own
// first frame instead of a black box. Once the video is near the screen
// (within 300 px), the browser loads only its details and first frame
// (preload="metadata"); "#t=0.1" points just after the start, which also
// makes Safari on an iPhone draw that frame. Videos further down the page
// load nothing until they come close. The whole video loads only on play.
export function ReviewVideo({
  url,
  reviewerName,
  label,
  className,
}: {
  url: string | null | undefined;
  reviewerName: string;
  // The name screen readers hear; "Video from <name>'s review" by default.
  label?: string;
  className?: string;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const [near, setNear] = useState(false);
  // The address that could not play, so a replaced video starts fresh
  // (code review 2026-11-23: "can't play" stayed after Replace).
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const failed = Boolean(url) && failedUrl === url;

  useEffect(() => {
    const element = video.current;
    if (!element || near) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) setNear(true);
      },
      { rootMargin: "300px 0px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [near, url]);

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
      ref={video}
      src={near ? `${url}#t=0.1` : undefined}
      controls
      preload={near ? "metadata" : "none"}
      playsInline
      onError={() => setFailedUrl(url ?? null)}
      aria-label={label ?? `Video from ${reviewerName}'s review`}
      className={className ?? "aspect-video w-full max-w-xl rounded-lg border border-white/20 bg-black"}
    />
  );
}

// "Add a video" in the review form (ticket 165): one MP4, MOV or WebM, up
// to 50 MB and 60 seconds, checked in the browser as soon as it is chosen,
// with a small preview. The form uploads it when the review is saved.
//
// Editing a review with a video (ticket 166): the saved video shows with
// Replace video (choose another; on save the backend attaches it and
// deletes the old one) and Remove video (marked for removal, with Keep the
// video to undo; nothing is deleted until Save).
export function ReviewVideoPicker({
  file,
  onFileChange,
  savedUrl,
  removeSaved,
  onRemoveSavedChange,
  disabled,
}: {
  file: File | null;
  onFileChange: (file: File | null) => void;
  // The review's saved video, when editing one that has a video.
  savedUrl: string | null;
  removeSaved: boolean;
  onRemoveSavedChange: (remove: boolean) => void;
  disabled?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const preview = useObjectUrl(file);

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

  const small = cn(pillButton({ kind: "glass" }), "h-9 px-3.5 text-sm");
  // A label for the hidden file input, so it works with a click, a tap or
  // the keyboard (the same way as Add photos).
  const chooser = (label: string) => (
    <label
      htmlFor={inputId}
      className={cn(
        small,
        "cursor-pointer has-focus-visible:outline-2 has-focus-visible:outline-white",
        (disabled || checking) && "pointer-events-none opacity-60",
      )}
    >
      <Film aria-hidden="true" />
      {label}
      {label === "Add a video" && <span className="font-normal text-white/70">(optional, up to 60 s)</span>}
    </label>
  );
  const showSaved = Boolean(savedUrl) && !removeSaved && !file;

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

      {file && preview ? (
        // A new video, not uploaded yet.
        <div className="w-full max-w-xs space-y-1.5">
          <video
            src={preview}
            controls
            muted
            playsInline
            preload="metadata"
            aria-label={`Preview of your ${savedUrl ? "new " : ""}video, ${file.name}`}
            className="aspect-video w-full rounded-lg border border-amber-300/60 bg-black"
          />
          {savedUrl && !removeSaved && (
            <p className="text-xs text-white/80">It replaces your current video when you save.</p>
          )}
          <button
            type="button"
            onClick={() => {
              setError(null);
              onFileChange(null);
            }}
            disabled={disabled}
            className={cn(small, "w-full justify-center")}
          >
            <X aria-hidden="true" />
            {savedUrl && !removeSaved ? "Keep the current video" : "Remove video"}
          </button>
        </div>
      ) : showSaved ? (
        // The review's saved video (ticket 166).
        <div className="w-full max-w-xs space-y-1.5">
          <ReviewVideo
            url={savedUrl}
            reviewerName=""
            label="Your review's video"
            className="aspect-video w-full rounded-lg border border-white/20 bg-black"
          />
          <div className="grid grid-cols-2 gap-2">
            {chooser("Replace video")}
            <button
              type="button"
              onClick={() => {
                setError(null);
                onRemoveSavedChange(true);
              }}
              disabled={disabled}
              className={cn(small, "justify-center")}
            >
              <X aria-hidden="true" />
              Remove video
            </button>
          </div>
        </div>
      ) : savedUrl && removeSaved ? (
        // Marked for removal; deleted only when the review is saved.
        <div className="flex flex-wrap items-center gap-2">
          <p role="status" className="text-sm text-white/85">
            The video will be removed when you save.
          </p>
          <button
            type="button"
            onClick={() => onRemoveSavedChange(false)}
            disabled={disabled}
            className={small}
          >
            Keep the video
          </button>
          {chooser("Add a different video")}
        </div>
      ) : (
        chooser("Add a video")
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
