import { env, maybe } from "@/env";

// Photos on the site come from three kinds of address:
//   - Wikimedia Commons thumbnails, where the URL itself picks the size
//     (".../thumb/a/a6/Name.jpg/1280px-Name.jpg"). Wikimedia only serves a
//     few fixed widths — 120, 250, 500, 960 and 1280; any other width
//     answers 400 — so a smaller size snaps to the nearest one.
//   - Place photos uploaded to Supabase Storage remain untouched in storage;
//     on the production site the page requests high-quality WebP copies
//     sized for display (see canResize).
//   - Anything else (Unsplash's already-sized URLs, the splash art):
//     returned unchanged.
//
// photoThumb(url, width) answers one size; photoSrcSet(url, widths)
// answers a srcset whose "Nw" descriptors are the widths the URLs really
// serve (Wikimedia's bucket, not the request), so the browser picks
// correctly. The uploaded Supabase object is never overwritten.

const WIKIMEDIA_BUCKETS = [120, 250, 500, 960, 1280];

// Supabase can send a resized copy of a Storage photo (the
// /storage/v1/render/image/ address), but only on a paid plan. The
// production project has it. The free staging project answers every resize
// with 403 "FeatureNotEnabled", which showed empty review thumbnails on
// staging (2026-11-24). So resized copies are asked for only on the
// production site; elsewhere the original photo is used, and the browser
// shrinks it to fit. If staging moves to a paid plan, or production to the
// free one, change this line.
function canResize(parsed: URL) {
  return parsed.hostname.endsWith(".supabase.co") && maybe(() => env.NEXT_PUBLIC_APP_ENV) === "production";
}

// The size segment at the end of a thumbnail path: "/1280px-Name.jpg".
const THUMB_TAIL = /\/\d+px-[^/?]+(\?.*)?$/;

function nearestBucket(width: number): number {
  return WIKIMEDIA_BUCKETS.reduce((best, bucket) =>
    Math.abs(bucket - width) < Math.abs(best - width) ? bucket : best,
  );
}

// One smaller Wikimedia thumbnail or high-quality Supabase display copy,
// and the width it serves; null for addresses without a safe variant.
function variant(url: string, width: number): { url: string; width: number } | null {
  // Wikimedia: only /thumb/ URLs carry a size in the path.
  if (url.includes("/thumb/") && THUMB_TAIL.test(url)) {
    const bucket = nearestBucket(width);
    try {
      const resized = new URL(url);
      resized.pathname = resized.pathname.replace(THUMB_TAIL, (tail) =>
        tail.replace(/\/\d+px-/, `/${bucket}px-`),
      );
      // Relay Wikimedia thumbnails through this site. That keeps Wikimedia's
      // response cookies out of the visitor's browser while preserving the
      // exact thumbnail bytes and keeping Wikimedia credit links unchanged.
      if (resized.hostname === "thumb.wikimedia.org" || resized.hostname === "upload.wikimedia.org") {
        return {
          url: `/api/wikimedia-photo?path=${encodeURIComponent(resized.pathname)}`,
          width: bucket,
        };
      }
    } catch {
      return null;
    }
  }

  // Supabase place-photo uploads stay intact; only the response used in the
  // browser is resized and encoded as high-quality WebP. No height or crop
  // mode is set, so the uploaded photo's full aspect ratio is preserved.
  try {
    const parsed = new URL(url);
    const object = /^\/storage\/v1\/object\/public\/place-photos\/(.+)$/.exec(parsed.pathname);
    if (canResize(parsed) && object) {
      parsed.pathname = `/storage/v1/render/image/public/place-photos/${object[1]}`;
      parsed.search = `?width=${width}&quality=85&format=webp`;
      return { url: parsed.toString(), width };
    }
  } catch {
    return null;
  }
  return null;
}

export function photoThumb(url: string, width: number): string {
  return variant(url, width)?.url ?? url;
}

// Review thumbnails use a smaller, full-frame delivery copy while the
// opened dialog keeps the original. The contain resize preserves the whole
// source within the square preview instead of cropping it.
export function reviewPhotoThumb(url: string, width = 224): string {
  try {
    const parsed = new URL(url);
    if (!canResize(parsed)) return url;
    const object = /^\/storage\/v1\/object\/public\/review-photos\/(.+)$/.exec(parsed.pathname);
    if (!object) return url;

    parsed.pathname = `/storage/v1/render/image/public/review-photos/${object[1]}`;
    parsed.search = `?width=${width}&height=${width}&resize=contain&quality=60&format=webp`;
    return parsed.toString();
  } catch {
    return url;
  }
}

export function photoSrcSet(url: string, widths: number[]): string | undefined {
  const byWidth = new Map<number, string>();
  for (const width of widths) {
    const v = variant(url, width);
    if (v) byWidth.set(v.width, v.url);
  }
  if (byWidth.size === 0) return undefined;
  return [...byWidth].map(([width, u]) => `${u} ${width}w`).join(", ");
}
