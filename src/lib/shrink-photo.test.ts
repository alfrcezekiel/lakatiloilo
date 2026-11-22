import { describe, expect, it, vi } from "vitest";
import { fitPhoto, MAX_PHOTO_BYTES, MAX_INPUT_BYTES, sizeFor, SHRINK_STEPS, type Decode, type Encode } from "./shrink-photo";

// The browser's canvas is not in the test runner, so the decode and save
// steps are pretend ones: a 4000 × 3000 photo, and a "saved" file whose
// size the test chooses for each try.
const MB = 1024 * 1024;
const file = (size: number, type = "image/jpeg", name = "beach.jpg") =>
  new File([new Uint8Array(size)], name, { type });
const decode: Decode = async () => ({ width: 4000, height: 3000, source: {} as CanvasImageSource });
// Answers the tries with these sizes, in order, as WebP unless told.
function encoder(sizes: number[], type = "image/webp") {
  const calls: { width: number; height: number; quality: number }[] = [];
  const encode: Encode = async (_picture, width, height, quality) => {
    calls.push({ width, height, quality });
    return new Blob([new Uint8Array(sizes[calls.length - 1] ?? 3 * MB)], { type });
  };
  return { encode, calls };
}

describe("fitPhoto", () => {
  it("keeps a photo of 2 MB or less exactly as chosen, without re-saving it", async () => {
    const small = file(MAX_PHOTO_BYTES);
    const tools = encoder([]);

    const fitted = await fitPhoto(small, { decode, encode: tools.encode });

    expect(fitted).toBe(small);
    expect(tools.calls).toHaveLength(0);
  });

  it("re-saves a 5 MB JPG as a WebP at full size and quality 0.92 when that fits", async () => {
    const tools = encoder([1.6 * MB]);

    const fitted = await fitPhoto(file(5 * MB), { decode, encode: tools.encode });

    expect(fitted?.type).toBe("image/webp");
    expect(fitted?.name).toBe("beach.webp");
    expect(fitted!.size).toBeLessThanOrEqual(MAX_PHOTO_BYTES);
    expect(tools.calls).toEqual([{ width: 4000, height: 3000, quality: 0.92 }]);
  });

  it("lowers the quality before it makes the picture smaller", async () => {
    const tools = encoder([3 * MB, 2.5 * MB, 2.2 * MB, 1.9 * MB]);

    await fitPhoto(file(8 * MB, "image/png", "logo.png"), { decode, encode: tools.encode });

    expect(tools.calls.map((c) => [c.width, c.quality])).toEqual([
      [4000, 0.92],
      [4000, 0.85],
      [4000, 0.8],
      [3840, 0.85],
    ]);
  });

  it("names a Safari JPG fallback .jpg, for the backend to turn into WebP", async () => {
    const tools = encoder([1.5 * MB], "image/jpeg");

    const fitted = await fitPhoto(file(4 * MB, "image/png", "view.png"), { decode, encode: tools.encode });

    expect([fitted?.type, fitted?.name]).toEqual(["image/jpeg", "view.jpg"]);
  });

  it("gives up (null, so the usual message shows) when even the smallest try is over 2 MB", async () => {
    const tools = encoder([]);

    const fitted = await fitPhoto(file(9 * MB), { decode, encode: tools.encode });

    expect(fitted).toBeNull();
    expect(tools.calls).toHaveLength(SHRINK_STEPS.length);
  });

  it("refuses a file that is not a JPG, PNG or WebP, and a file over 40 MB, without reading it", async () => {
    const read = vi.fn(decode);

    expect(await fitPhoto(file(3 * MB, "image/gif", "a.gif"), { decode: read, encode: encoder([]).encode })).toBeNull();
    expect(await fitPhoto(file(MAX_INPUT_BYTES + 1), { decode: read, encode: encoder([]).encode })).toBeNull();
    expect(read).not.toHaveBeenCalled();
  });

  it("refuses a file that can't be read as a picture", async () => {
    const broken: Decode = async () => {
      throw new Error("not an image");
    };

    expect(await fitPhoto(file(3 * MB), { decode: broken, encode: encoder([]).encode })).toBeNull();
  });
});

describe("sizeFor", () => {
  it("keeps the shape, never enlarges, and stays within what a phone's canvas can hold", () => {
    expect(sizeFor(4000, 3000, 3840)).toEqual({ width: 3840, height: 2880 });
    expect(sizeFor(1200, 800, 3840)).toEqual({ width: 1200, height: 800 });
    const huge = sizeFor(8064, 6048, 0); // a 48-megapixel phone photo
    expect(huge.width * huge.height).toBeLessThanOrEqual(16_000_000);
    expect(huge.width / huge.height).toBeCloseTo(8064 / 6048, 2);
  });
});
