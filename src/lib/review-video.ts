import { env, maybe } from "@/env";

// A video in a review (ticket 165, reviews & media round).
//
// The one place the browser talks to Supabase Storage itself (team decision
// 2026-11-22, recorded in .claude/rules/frontend.md): a video is too big for
// our backend, because every request through Vercel stops at 4.5 MB. So the
// browser uploads the file straight into the traveler's own folder of the
// review-videos bucket, with the traveler's own login and the public
// (anon) key; Supabase's Storage rules let a traveler write only into their
// own folder (supabase/sql/065). Then the backend checks the file and
// attaches it to the review (attachReviewVideo in src/lib/api.ts).
//
// The file is uploaded exactly as chosen: never re-compressed, so its
// quality stays the same.

export const VIDEO_TYPES: Record<string, string> = {
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/webm": "webm",
};
// The same limit and words as the backend's
// backend/src/v1/reviews/review-videos.service.ts (and the bucket in 065):
// change them together.
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
export const MAX_VIDEO_SECONDS = 60;
export const VIDEO_MESSAGE = "Please choose an MP4, MOV or WebM video up to 50 MB and 60 seconds.";
// For the file chooser: the types, and ".mov" for phones that don't name it.
export const VIDEO_ACCEPT = [...Object.keys(VIDEO_TYPES), ".mov", ".mp4", ".webm"].join(",");

// The video's type: what the browser says, or from its name when the
// browser says nothing (some Android phones with a .mov).
export function videoTypeOf(file: File): string | null {
  if (VIDEO_TYPES[file.type]) return file.type;
  if (file.type) return null;
  const extension = file.name.split(".").pop()?.toLowerCase();
  return Object.entries(VIDEO_TYPES).find(([, ext]) => ext === extension)?.[0] ?? null;
}

// How long the video is, in seconds, read by the browser from the file
// itself; null when this browser can't read it (for example a MOV recorded
// in HEVC on a laptop browser that can't play HEVC). Never waits forever.
export type ReadSeconds = (file: File) => Promise<number | null>;
export const readSeconds: ReadSeconds = (file) =>
  new Promise((resolve) => {
    const video = document.createElement("video");
    const url = URL.createObjectURL(file);
    let done = false;
    const finish = (seconds: number | null) => {
      if (done) return;
      done = true;
      URL.revokeObjectURL(url);
      video.removeAttribute("src");
      resolve(seconds);
    };
    video.preload = "metadata";
    video.muted = true;
    video.onloadedmetadata = () => finish(Number.isFinite(video.duration) ? video.duration : null);
    video.onerror = () => finish(null);
    window.setTimeout(() => finish(null), 8000);
    video.src = url;
  });

// The message for a chosen video, or null when it can be used: an MP4, MOV
// or WebM, up to 50 MB, and (when the browser can tell) up to 60 seconds.
// A length the browser can't read is let through; the type and size are
// checked again by the bucket and the backend.
export async function checkVideo(file: File, seconds: ReadSeconds = readSeconds): Promise<string | null> {
  if (!videoTypeOf(file) || file.size > MAX_VIDEO_BYTES || file.size === 0) return VIDEO_MESSAGE;
  const length = await seconds(file);
  if (length !== null && length > MAX_VIDEO_SECONDS + 0.5) return VIDEO_MESSAGE;
  return null;
}

// The traveler's id, read from their own login token (the folder name).
// Not trusted for anything: Storage checks the real login.
export function userIdFromToken(accessToken: string): string | null {
  try {
    const part = accessToken.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const claims = JSON.parse(atob(part.padEnd(Math.ceil(part.length / 4) * 4, "="))) as { sub?: unknown };
    return typeof claims.sub === "string" ? claims.sub : null;
  } catch {
    return null;
  }
}

// Where a new upload goes: "<user id>/<random id>.<mp4|mov|webm>", the
// shape the backend and the database accept.
export function newVideoPath(userId: string, file: File): string {
  const type = videoTypeOf(file) ?? "video/mp4";
  return `${userId}/${crypto.randomUUID()}.${VIDEO_TYPES[type]}`;
}

// Uploads the video into the traveler's own folder and answers its path.
// onProgress gets 0 to 100. Uses XMLHttpRequest because it is the browser
// tool that reports upload progress.
export function uploadReviewVideo(
  file: File,
  accessToken: string,
  onProgress: (percent: number) => void,
): Promise<string> {
  const supabaseUrl = maybe(() => env.NEXT_PUBLIC_SUPABASE_URL);
  const anonKey = maybe(() => env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const userId = userIdFromToken(accessToken);
  if (!supabaseUrl || !anonKey || !userId) return Promise.reject(new Error("Please log in again, then try again."));
  const path = newVideoPath(userId, file);
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("POST", `${supabaseUrl}/storage/v1/object/review-videos/${path}`);
    request.setRequestHeader("Authorization", `Bearer ${accessToken}`);
    request.setRequestHeader("apikey", anonKey);
    request.setRequestHeader("x-upsert", "false");
    request.setRequestHeader("Content-Type", videoTypeOf(file) ?? "video/mp4");
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    request.onload = () =>
      request.status >= 200 && request.status < 300
        ? resolve(path)
        : reject(new Error(request.status === 413 || request.status === 400 ? VIDEO_MESSAGE : "We couldn't upload your video. Please try again."));
    request.onerror = () => reject(new Error("We couldn't upload your video. Please check your connection and try again."));
    request.send(file);
  });
}

// Deletes a video this browser just uploaded into the traveler's own folder,
// when attaching it to the review failed (code review 2026-11-23), so it
// doesn't fill the free storage. The Storage rules let a traveler delete
// only in their own folder (065). Never throws: a leftover is only a
// leftover (cleaning those up is parked in docs/LATER.md).
export async function deleteUploadedVideo(path: string, accessToken: string): Promise<void> {
  const supabaseUrl = maybe(() => env.NEXT_PUBLIC_SUPABASE_URL);
  const anonKey = maybe(() => env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  if (!supabaseUrl || !anonKey) return;
  try {
    await fetch(`${supabaseUrl}/storage/v1/object/review-videos/${path}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}`, apikey: anonKey },
    });
  } catch {
    // Offline or refused: nothing more to do here.
  }
}
