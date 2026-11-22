// Photos over 2 MB (team request 2026-11-22, change to ticket 164): a JPG,
// PNG or WebP bigger than 2 MB is re-saved in the browser, before it is
// uploaded, as a WebP of at most 2 MB. Then the backend checks the 2 MB
// limit as before and saves it (photo-webp.ts in the backend).
//
// Why in the browser: every upload passes through Vercel, which refuses any
// request over 4.5 MB, and phone photos are often 3 to 8 MB, so the backend
// would never see them. The browser's own canvas does the work; no library.
//
// Quality first: the first try keeps the full size at WebP quality 0.92,
// which looks the same as the original. Only if that is still over 2 MB
// does it try a slightly lower quality, and only then a smaller picture
// (still at least 2048 px on its long side, sharper than any screen shows
// it). Nothing fits, or not a photo: null, and the picker shows the usual
// "Please choose a JPG, PNG or WebP photo up to 2 MB."
//
// Safari can't always save WebP from a canvas (it quietly gives a PNG):
// then it saves a JPG at the same quality, and the backend makes it WebP.
// A photo re-saved here loses its hidden metadata (GPS included) and is
// turned upright first, like the backend does.

// The same types, limit and words as the backend's
// backend/src/v1/reviews/review-photos.service.ts (and the buckets in 027
// and 049): change them together.
export const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const MAX_PHOTO_BYTES = 2 * 1024 * 1024;
export const PHOTO_MESSAGE = "Please choose a JPG, PNG or WebP photo up to 2 MB.";
// A bigger file is refused straight away: decoding it could run a phone
// out of memory.
export const MAX_INPUT_BYTES = 40 * 1024 * 1024;
// The biggest picture a phone's canvas can hold (iOS Safari: 16.7 million
// pixels); a bigger photo is drawn smaller from the start.
const MAX_CANVAS_PIXELS = 16_000_000;

// The tries, in order: [longest side in px (0 = as it is), quality].
export const SHRINK_STEPS: [number, number][] = [
  [0, 0.92],
  [0, 0.85],
  [0, 0.8],
  [3840, 0.85],
  [3200, 0.85],
  [2560, 0.85],
  [2048, 0.8],
];

export type Decoded = { width: number; height: number; source: CanvasImageSource; close?: () => void };
export type Encode = (picture: Decoded, width: number, height: number, quality: number) => Promise<Blob>;
export type Decode = (file: File) => Promise<Decoded>;

// The size to draw at for one try: never bigger than the original or than
// a canvas can hold.
export function sizeFor(width: number, height: number, longest: number) {
  let scale = longest > 0 ? Math.min(1, longest / Math.max(width, height)) : 1;
  scale = Math.min(scale, Math.sqrt(MAX_CANVAS_PIXELS / (width * height)));
  // Rounded down: rounding up could land a few pixels over a phone's limit.
  return { width: Math.max(1, Math.floor(width * scale)), height: Math.max(1, Math.floor(height * scale)) };
}

// The photo to upload: the file itself when it already fits, a re-saved
// copy of at most 2 MB when it doesn't, or null when it can't be used.
export async function fitPhoto(
  file: File,
  tools: { decode: Decode; encode: Encode } = { decode: decodeInBrowser, encode: encodeInBrowser },
): Promise<File | null> {
  if (!PHOTO_TYPES.includes(file.type)) return null;
  if (file.size <= MAX_PHOTO_BYTES) return file;
  if (file.size > MAX_INPUT_BYTES) return null;

  let picture: Decoded;
  try {
    picture = await tools.decode(file);
  } catch {
    return null;
  }
  try {
    for (const [longest, quality] of SHRINK_STEPS) {
      const size = sizeFor(picture.width, picture.height, longest);
      const blob = await tools.encode(picture, size.width, size.height, quality);
      if (blob.size <= MAX_PHOTO_BYTES) {
        const extension = blob.type === "image/webp" ? "webp" : "jpg";
        const name = `${file.name.replace(/\.[^.]+$/, "") || "photo"}.${extension}`;
        return new File([blob], name, { type: blob.type, lastModified: file.lastModified });
      }
    }
    return null;
  } catch {
    return null;
  } finally {
    picture.close?.();
  }
}

// Reads the photo, turned upright from its camera orientation note.
async function decodeInBrowser(file: File): Promise<Decoded> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  return { width: bitmap.width, height: bitmap.height, source: bitmap, close: () => bitmap.close() };
}

// Saves one try as WebP; where the browser can't, as JPG at the same
// quality (on a white background, as JPG has no see-through parts).
async function encodeInBrowser(picture: Decoded, width: number, height: number, quality: number): Promise<Blob> {
  const webp = await draw(picture, width, height, "image/webp", quality, false);
  if (webp.type === "image/webp") return webp;
  return draw(picture, width, height, "image/jpeg", quality, true);
}

function draw(
  picture: Decoded,
  width: number,
  height: number,
  type: string,
  quality: number,
  whiteBackground: boolean,
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return Promise.reject(new Error("No canvas"));
  if (whiteBackground) {
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
  }
  context.imageSmoothingQuality = "high";
  context.drawImage(picture.source, 0, 0, width, height);
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Could not save"))), type, quality),
  );
}
