// eslint-disable-next-line @typescript-eslint/no-require-imports -- the same import as photo-webp.ts
import sharp = require('sharp');
import { describe, expect, it } from '@jest/globals';
import { toSmallerWebp } from './photo-webp';

// Test photos are drawn here with sharp itself: no real photo, no network.

// A smooth, photo-like picture (colour gradients with a little texture),
// so it compresses like a real photo rather than a flat colour.
function photoPixels(width: number, height: number, channels: 3 | 4) {
  const raw = Buffer.alloc(width * height * channels);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * channels;
      const texture = ((x * 7 + y * 13) % 17) - 8;
      raw[i] = Math.max(0, Math.min(255, Math.round((x / width) * 255) + texture));
      raw[i + 1] = Math.max(0, Math.min(255, Math.round((y / height) * 200) + texture));
      raw[i + 2] = Math.max(0, Math.min(255, 120 + Math.round(Math.sin(x / 40) * 60)));
      if (channels === 4) raw[i + 3] = x < width / 2 ? 255 : Math.round((y / height) * 255);
    }
  }
  return sharp(raw, { raw: { width, height, channels } });
}

describe('toSmallerWebp', () => {
  it('saves a JPG photo as a smaller WebP of the same size in pixels', async () => {
    const jpg = await photoPixels(800, 600, 3).jpeg({ quality: 95 }).toBuffer();

    const stored = await toSmallerWebp({ buffer: jpg, contentType: 'image/jpeg', extension: 'jpg' });

    expect(stored.contentType).toBe('image/webp');
    expect(stored.extension).toBe('webp');
    expect(stored.buffer.length).toBeLessThan(jpg.length);
    const meta = await sharp(stored.buffer).metadata();
    expect([meta.format, meta.width, meta.height]).toEqual(['webp', 800, 600]);
  });

  it('turns a sideways phone photo upright and drops its GPS location', async () => {
    const sideways = await photoPixels(800, 600, 3)
      .jpeg({ quality: 95 })
      .withMetadata({ orientation: 6 })
      .withExif({ IFD3: { GPSLatitudeRef: 'N', GPSLatitude: '10/1 41/1 30/1' } })
      .toBuffer();
    expect((await sharp(sideways).metadata()).exif).toBeDefined();

    const stored = await toSmallerWebp({ buffer: sideways, contentType: 'image/jpeg', extension: 'jpg' });

    const meta = await sharp(stored.buffer).metadata();
    expect([meta.width, meta.height]).toEqual([600, 800]);
    expect(meta.orientation).toBeUndefined();
    expect(meta.exif).toBeUndefined();
  });

  it('keeps every visible pixel of a see-through PNG exactly (lossless)', async () => {
    const png = await photoPixels(200, 150, 4).png().toBuffer();

    const stored = await toSmallerWebp({ buffer: png, contentType: 'image/png', extension: 'png' });

    expect(stored.contentType).toBe('image/webp');
    const before = await sharp(png).raw().toBuffer();
    const after = await sharp(stored.buffer).ensureAlpha().raw().toBuffer();
    // Fully transparent pixels never show, so their hidden colour may
    // change; every other pixel, and every transparency value, may not.
    let changedVisible = 0;
    for (let i = 0; i < before.length; i += 4) {
      if (before[i + 3] !== after[i + 3]) changedVisible++;
      else if (before[i + 3] > 0 && !before.subarray(i, i + 3).equals(after.subarray(i, i + 3))) changedVisible++;
    }
    expect(changedVisible).toBe(0);
  });

  it('saves a PNG photo with no see-through parts as a smaller WebP', async () => {
    const png = await photoPixels(600, 400, 3).png().toBuffer();

    const stored = await toSmallerWebp({ buffer: png, contentType: 'image/png', extension: 'png' });

    expect(stored.contentType).toBe('image/webp');
    expect(stored.buffer.length).toBeLessThan(png.length);
  });

  it('keeps a hard-squeezed JPG as uploaded when the WebP would not be smaller', async () => {
    // Busy detail saved at JPG quality 30: WebP at quality 90 would be
    // about three times bigger (measured 2026-11-22), so it is kept.
    const raw = Buffer.alloc(400 * 300 * 3);
    let seed = 1;
    for (let i = 0; i < raw.length; i++) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      raw[i] = seed & 255;
    }
    const squeezed = await sharp(raw, { raw: { width: 400, height: 300, channels: 3 } }).jpeg({ quality: 30 }).toBuffer();

    const stored = await toSmallerWebp({ buffer: squeezed, contentType: 'image/jpeg', extension: 'jpg' });

    expect(stored.contentType).toBe('image/jpeg');
    expect(stored.buffer.equals(squeezed)).toBe(true);
  });

  it('keeps a photo uploaded as WebP exactly as it is', async () => {
    const webp = await photoPixels(300, 200, 3).webp({ quality: 80 }).toBuffer();

    const stored = await toSmallerWebp({ buffer: webp, contentType: 'image/webp', extension: 'webp' });

    expect(stored.buffer).toBe(webp);
  });
});
