"use client";

import { X } from "lucide-react";
import { useRef } from "react";
import { cn } from "@/lib/utils";
import { pillButton } from "@/components/ui/button";

// A review's photo under its text (review extras round, ticket 81).
// Clicking it opens it larger in a pop-up (the browser's own <dialog>, so
// Escape closes it, and so do the Close button and clicking the dim
// background). Everyone can see review photos.
export function ReviewPhoto({ url, reviewerName }: { url: string; reviewerName: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const alt = `Photo from ${reviewerName}'s review`;

  return (
    <>
      <button
        type="button"
        onClick={() => dialog.current?.showModal()}
        className="block overflow-hidden rounded-lg border border-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        aria-label={`${alt}, open larger`}
      >
        <img src={url} alt={alt} loading="lazy" className="h-44 w-auto max-w-full object-cover sm:h-52" />
      </button>

      <dialog
        ref={dialog}
        aria-label={alt}
        // A click on the dim background (the dialog itself, not the photo)
        // closes it.
        onClick={(e) => {
          if (e.target === dialog.current) dialog.current?.close();
        }}
        className="m-auto max-h-[90vh] max-w-[min(56rem,calc(100%-2rem))] overflow-visible bg-transparent p-0 backdrop:bg-black/75"
      >
        <div className="flex flex-col items-end gap-3">
          <button
            type="button"
            onClick={() => dialog.current?.close()}
            className={cn(pillButton({ kind: "glass" }), "h-9 px-3.5 text-sm")}
          >
            <X aria-hidden="true" />
            Close
          </button>
          <img
            src={url}
            alt={alt}
            className="max-h-[80vh] w-auto max-w-full rounded-xl object-contain"
          />
        </div>
      </dialog>
    </>
  );
}
