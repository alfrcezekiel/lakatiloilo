// "import … = require": sharp exports one function (export =). The build
// compiles without esModuleInterop and the tests with it; this form is the
// one that gives the function in both.
// eslint-disable-next-line @typescript-eslint/no-require-imports -- see the note above
import sharp = require('sharp');
import { stripJpeg, stripPng, stripWebp } from './strip-metadata';

// Saving photos as WebP (ticket 164, reviews & media round; sharp agreed by
// the team on 2026-11-22). Used by every photo upload: a traveler's review
// photos and, in /admin, a new place's photo, its extra photos and a
// replaced photo (they all go through ReviewPhotosService.upload or
// PlacePhotosService.upload).
//
// The team asked for smaller files that look the same, so:
// - The width and height never change (no resizing).
// - A file that would open as a picture over 50 million pixels is refused
//   before it is decoded (code review 2026-11-23: a 758 KB PNG of one colour
//   can open as 732 MB of pixels and run the backend out of memory). 50
//   million is above a 48-megapixel phone photo.
// - A photo (JPG, or a PNG with no see-through pixels) is saved at WebP
//   quality 90: the eye can't tell it from the original, and it is usually
//   far smaller. A PNG with see-through parts (a logo, a screenshot with
//   transparency) is saved lossless: every pixel you can see stays exactly
//   the same (only the hidden colour under fully transparent pixels may
//   change, which never shows). A PNG with a transparency channel but no
//   see-through pixel counts as a photo (code review 2026-11-23).
// - The photo is turned upright from its camera "orientation" note first,
//   so a phone photo never ends up sideways, and only its colour profile
//   is kept: the camera details and a phone's GPS location are dropped.
// - If the WebP would not be smaller, the photo is kept as uploaded, so a
//   file never grows (JPGs that were already squeezed hard). A photo
//   uploaded as WebP is kept too. Either way its hidden metadata (GPS
//   included) is cut out without re-compressing it (strip-metadata.ts), so
//   no stored photo keeps a phone's location (code review 2026-11-23).

export type StoredPhoto = { buffer: Buffer; contentType: string; extension: string };

// The quality for photos: high enough that the WebP looks the same as the
// original side by side.
export const WEBP_PHOTO_QUALITY = 90;

// The most pixels a photo may open as (see above).
export const MAX_INPUT_PIXELS = 50_000_000;

// The photo as uploaded, with its hidden metadata cut out.
async function keptAsUploaded(original: StoredPhoto, orientation?: number): Promise<StoredPhoto> {
  const buffer =
    original.contentType === 'image/jpeg'
      ? stripJpeg(original.buffer, orientation)
      : original.contentType === 'image/png'
        ? stripPng(original.buffer)
        : stripWebp(original.buffer);
  return { ...original, buffer };
}

export async function toSmallerWebp(original: StoredPhoto): Promise<StoredPhoto> {
  const image = sharp(original.buffer, { failOn: 'error', limitInputPixels: MAX_INPUT_PIXELS });
  // Reads only the file's header: the pixel limit is checked here, before
  // anything big is decoded.
  const { hasAlpha, width = 0, height = 0, orientation } = await image.metadata();
  if (width * height > MAX_INPUT_PIXELS) throw new Error('Too many pixels');
  if (original.contentType === 'image/webp') return keptAsUploaded(original);

  // Lossless only when some pixel really is see-through.
  const lossless = original.contentType === 'image/png' && Boolean(hasAlpha) && !(await image.stats()).isOpaque;

  const webp = await image
    // Upright from the camera's orientation note; afterwards no note is
    // needed, so none is written.
    .rotate()
    // The colour profile only (so colours look the same); everything else,
    // GPS included, is left out.
    .keepIccProfile()
    .webp(lossless ? { lossless: true, effort: 4 } : { quality: WEBP_PHOTO_QUALITY, smartSubsample: true, effort: 4 })
    .toBuffer();

  if (webp.length >= original.buffer.length) return keptAsUploaded(original, orientation);
  return { buffer: webp, contentType: 'image/webp', extension: 'webp' };
}
