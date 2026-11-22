// "import … = require": sharp exports one function (export =). The build
// compiles without esModuleInterop and the tests with it; this form is the
// one that gives the function in both.
// eslint-disable-next-line @typescript-eslint/no-require-imports -- see the note above
import sharp = require('sharp');

// Saving photos as WebP (ticket 164, reviews & media round; sharp agreed by
// the team on 2026-11-22). Used by every photo upload: a traveler's review
// photos and, in /admin, a new place's photo, its extra photos and a
// replaced photo (they all go through ReviewPhotosService.upload or
// PlacePhotosService.upload).
//
// The team asked for smaller files that look the same, so:
// - The width and height never change (no resizing).
// - A photo (JPG, or a PNG with no see-through parts) is saved at WebP
//   quality 90: the eye can't tell it from the original, and it is usually
//   far smaller. A PNG with see-through parts (a logo, a screenshot with
//   transparency) is saved lossless: every pixel you can see stays exactly
//   the same (only the hidden colour under fully transparent pixels may
//   change, which never shows).
// - The photo is turned upright from its camera "orientation" note first,
//   so a phone photo never ends up sideways, and only its colour profile
//   is kept: the camera details and a phone's GPS location are dropped.
// - If the WebP would not be smaller, the photo is kept exactly as
//   uploaded, so a file never grows. That happens with JPGs that were
//   already squeezed hard; such a photo also keeps its original metadata,
//   as every photo did before this ticket.
// - A photo already uploaded as WebP is kept as it is.

export type StoredPhoto = { buffer: Buffer; contentType: string; extension: string };

// The quality for photos: high enough that the WebP looks the same as the
// original side by side.
export const WEBP_PHOTO_QUALITY = 90;

export async function toSmallerWebp(original: StoredPhoto): Promise<StoredPhoto> {
  if (original.contentType === 'image/webp') return original;

  const image = sharp(original.buffer, { failOn: 'error' });
  const { hasAlpha } = await image.metadata();
  const lossless = original.contentType === 'image/png' && Boolean(hasAlpha);

  const webp = await image
    // Upright from the camera's orientation note; afterwards no note is
    // needed, so none is written.
    .rotate()
    // The colour profile only (so colours look the same); everything else,
    // GPS included, is left out.
    .keepIccProfile()
    .webp(lossless ? { lossless: true, effort: 4 } : { quality: WEBP_PHOTO_QUALITY, smartSubsample: true, effort: 4 })
    .toBuffer();

  if (webp.length >= original.buffer.length) return original;
  return { buffer: webp, contentType: 'image/webp', extension: 'webp' };
}
