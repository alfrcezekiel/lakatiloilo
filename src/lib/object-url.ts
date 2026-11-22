"use client";

import { useEffect, useMemo } from "react";

// A temporary address for a chosen file, so it can be previewed before it
// is uploaded (photos, a review video), freed again when it is no longer
// shown (code review 2026-11-23).
//
// Why the freeing waits a moment: in development React mounts, unmounts and
// mounts every component once more on purpose (StrictMode). Freeing the
// address straight away in that unmount left the preview pointing at a dead
// address; a video preview could then show nothing. Here the freeing is
// scheduled, and cancelled if the same address is used again at once; a
// preview that really goes away is still freed a moment later.

const pending = new Map<string, number>();

function keep(url: string) {
  const timer = pending.get(url);
  if (timer !== undefined) {
    window.clearTimeout(timer);
    pending.delete(url);
  }
}

function freeSoon(url: string) {
  pending.set(
    url,
    window.setTimeout(() => {
      pending.delete(url);
      URL.revokeObjectURL(url);
    }, 1000),
  );
}

// One file's preview address, or null.
export function useObjectUrl(file: File | null): string | null {
  const url = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => {
    if (!url) return;
    keep(url);
    return () => freeSoon(url);
  }, [url]);
  return url;
}

// The preview addresses of several files, in the same order.
export function useObjectUrls(files: File[]): string[] {
  const urls = useMemo(() => files.map((file) => URL.createObjectURL(file)), [files]);
  useEffect(() => {
    urls.forEach(keep);
    return () => urls.forEach(freeSoon);
  }, [urls]);
  return urls;
}
