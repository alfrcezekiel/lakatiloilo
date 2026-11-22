import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
// eslint-disable-next-line @typescript-eslint/no-require-imports -- the same import as src/v1/reviews/photo-webp.ts
import sharp = require('sharp');
import { SupabaseService } from '../../src/supabase/supabase.service';
import { fakeSupabase } from '../fakes/supabase.fake';
import { TOKENS, TRAVELER_ID } from '../fixtures/people';
import { PlacePhotosService } from '../../src/v1/admin/place-photos.service';
import { PHOTO_MESSAGE, ReviewPhotosService, type UploadedPhoto } from '../../src/v1/reviews/review-photos.service';

// Ticket 164: every photo upload — a traveler's review photo and the
// /admin place photo (new place, extra photos and a replaced photo all use
// PlacePhotosService.upload) — saves a JPG or PNG as WebP. Supabase is the
// shared pretend one; its Storage here only records what would be saved.

type Saved = { bucket: string; path: string; body: Buffer; contentType: string };

async function setUp() {
  const saved: Saved[] = [];
  const supabase = {
    ...fakeSupabase(),
    travelerClient: () => ({
      storage: {
        from: (bucket: string) => ({
          upload: async (path: string, body: Buffer, options: { contentType: string }) => {
            saved.push({ bucket, path, body, contentType: options.contentType });
            return { error: null };
          },
          remove: async () => ({ error: null }),
        }),
      },
    }),
  };
  const testingModule = await Test.createTestingModule({
    providers: [ReviewPhotosService, PlacePhotosService, { provide: SupabaseService, useValue: supabase }],
  }).compile();
  return {
    saved,
    reviewPhotos: testingModule.get(ReviewPhotosService),
    placePhotos: testingModule.get(PlacePhotosService),
  };
}

// A photo-like picture, as the browser would send it.
async function upload(format: 'jpeg' | 'png' | 'webp'): Promise<UploadedPhoto> {
  const raw = Buffer.alloc(320 * 240 * 3);
  for (let i = 0; i < raw.length; i += 3) {
    const x = (i / 3) % 320;
    const y = Math.floor(i / 3 / 320);
    raw[i] = x % 256;
    raw[i + 1] = (y * 2) % 256;
    raw[i + 2] = (x + y) % 256;
  }
  const image = sharp(raw, { raw: { width: 320, height: 240, channels: 3 } });
  const buffer = await (format === 'jpeg' ? image.jpeg({ quality: 95 }) : format === 'png' ? image.png() : image.webp()).toBuffer();
  return { buffer, size: buffer.length, mimetype: `image/${format}`, originalname: `photo.${format === 'jpeg' ? 'jpg' : format}` };
}

describe('photo uploads save WebP (ticket 164)', () => {
  it.each(['jpeg', 'png'] as const)('saves a review photo sent as %s as a .webp file in the traveler\'s folder', async (format) => {
    const { saved, reviewPhotos } = await setUp();
    const photo = await upload(format);

    const path = await reviewPhotos.upload(TOKENS.traveler, photo);

    expect(path).toMatch(new RegExp(`^${TRAVELER_ID}/[0-9a-f-]{36}\\.webp$`));
    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({ bucket: 'review-photos', contentType: 'image/webp' });
    expect(saved[0].body.length).toBeLessThan(photo.size);
    expect((await sharp(saved[0].body).metadata()).format).toBe('webp');
  });

  it('keeps a review photo sent as WebP exactly as it is', async () => {
    const { saved, reviewPhotos } = await setUp();
    const photo = await upload('webp');

    await reviewPhotos.upload(TOKENS.traveler, photo);

    expect(saved[0].contentType).toBe('image/webp');
    expect(saved[0].body.equals(photo.buffer)).toBe(true);
  });

  it.each(['jpeg', 'png'] as const)('saves an /admin place photo sent as %s as a .webp file', async (format) => {
    const { saved, placePhotos } = await setUp();
    const photo = await upload(format);

    const url = await placePhotos.upload(TOKENS.admin, 'destination', 'place-1', photo);

    expect(url).toMatch(/^https:\/\/storage\.example\.test\/place-photos\/destination\/place-1\/[0-9a-f-]{36}\.webp$/);
    expect(saved[0]).toMatchObject({ bucket: 'place-photos', contentType: 'image/webp' });
    expect(saved[0].body.length).toBeLessThan(photo.size);
  });

  it('refuses a file that starts like a JPG but is not a photo, with the usual message, and saves nothing', async () => {
    const { saved, reviewPhotos } = await setUp();
    const broken = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.from('not really a photo')]);

    const attempt = reviewPhotos.upload(TOKENS.traveler, { buffer: broken, size: broken.length, mimetype: 'image/jpeg', originalname: 'x.jpg' });

    await expect(attempt).rejects.toThrow(new BadRequestException(PHOTO_MESSAGE));
    expect(saved).toHaveLength(0);
  });

  it('still refuses a photo over 2 MB before converting it', async () => {
    const { saved, placePhotos } = await setUp();
    const big = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff]), Buffer.alloc(2 * 1024 * 1024)]);

    const attempt = placePhotos.upload(TOKENS.admin, 'accommodation', 'place-2', { buffer: big, size: big.length, mimetype: 'image/jpeg', originalname: 'big.jpg' });

    await expect(attempt).rejects.toThrow(PHOTO_MESSAGE);
    expect(saved).toHaveLength(0);
  });
});
