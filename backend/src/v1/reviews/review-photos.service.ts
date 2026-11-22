import { randomUUID } from 'crypto';
import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';
import { toSmallerWebp } from './photo-webp';

const BUCKET = 'review-photos';
// The same limit and words as the website's src/lib/shrink-photo.ts (and
// the buckets in 027 and 049): change them together.
export const MAX_PHOTO_BYTES = 2 * 1024 * 1024;
export const PHOTO_MESSAGE = 'Please choose a JPG, PNG or WebP photo up to 2 MB.';
export const MAX_PHOTOS = 4;
export const TOO_MANY_PHOTOS = 'A review can have up to 4 photos.';

// What the upload handling (multer) hands over for one uploaded file. Only
// the parts used here, written out so the project needs no extra package.
export interface UploadedPhoto {
  buffer: Buffer;
  size: number;
  mimetype: string;
  originalname: string;
}

type PhotoType = { contentType: string; extension: string };

// One of a review's photos as the website gets it (ticket 113).
export interface ReviewPhotoDto {
  id: string;
  url: string;
  // 1 to 4
  position: number;
}

// Anything that can run a query: the backend's own connection, or a
// traveler's or admin's transaction.
export type Querier = { query: (sql: string, parameters?: unknown[]) => Promise<unknown> };

// Works out the photo's real type from its first bytes, not from its name
// or what the browser says, so a renamed file of another kind is refused.
const photoTypeOf = (buffer: Buffer): PhotoType | null => {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { contentType: 'image/jpeg', extension: 'jpg' };
  }
  if (
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return { contentType: 'image/png', extension: 'png' };
  }
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return { contentType: 'image/webp', extension: 'webp' };
  }
  return null;
};

// Review photos in Supabase Storage (review extras round, ticket 81). Every
// upload and delete is made AS the logged-in traveler (their login is sent
// to Storage), so the Storage policies in 027 decide: a traveler can only
// touch files in their own folder, "<user id>/…". The backend never uses
// the service_role key.
@Injectable()
export class ReviewPhotosService {
  private readonly logger = new Logger(ReviewPhotosService.name);

  constructor(private readonly supabase: SupabaseService) {}

  // Checks the photo: at most 2 MB, and really a JPG, PNG or WebP.
  check(photo: UploadedPhoto): PhotoType {
    const type = photoTypeOf(photo.buffer);
    if (photo.size > MAX_PHOTO_BYTES || !type) throw new BadRequestException(PHOTO_MESSAGE);
    return type;
  }

  // Uploads the photo into the traveler's own folder under a new random
  // name, and answers where it is ("<user id>/<random>.<webp|jpg|png>").
  // A JPG or PNG is saved as a smaller WebP that looks the same (ticket
  // 164, photo-webp.ts).
  async upload(accessToken: string, photo: UploadedPhoto): Promise<string> {
    const type = this.check(photo);
    const userId = await this.supabase.userIdFor(accessToken);
    if (!userId) throw new UnauthorizedException('Please log in again, then try again.');

    const stored = await this.toStored(photo, type);
    const path = `${userId}/${randomUUID()}.${stored.extension}`;
    const { error } = await this.supabase
      .travelerClient(accessToken)
      .storage.from(BUCKET)
      .upload(path, stored.buffer, { contentType: stored.contentType, upsert: false });
    if (error) {
      this.logger.error(`Could not upload review photo: ${error.message}`);
      throw new ServiceUnavailableException("We couldn't save your photo. Please try again.");
    }
    return path;
  }

  // The file to store: the smaller WebP, or the photo as uploaded. A file
  // that starts like a photo but can't be read as one gets the usual
  // "Please choose a JPG, PNG or WebP photo up to 2 MB." (ticket 164).
  async toStored(photo: UploadedPhoto, type: PhotoType) {
    try {
      return await toSmallerWebp({ buffer: photo.buffer, ...type });
    } catch {
      throw new BadRequestException(PHOTO_MESSAGE);
    }
  }

  // Deletes a photo as the traveler. Used after a review is deleted, or to
  // tidy up when saving a review fails after its photo was uploaded. It
  // never fails the request: a leftover file is only logged.
  async remove(accessToken: string, path: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .travelerClient(accessToken)
        .storage.from(BUCKET)
        .remove([path]);
      if (error) this.logger.warn(`Could not delete review photo ${path}: ${error.message}`);
    } catch (error) {
      this.logger.warn(`Could not delete review photo ${path}: ${String(error)}`);
    }
  }

  // Each review's photos (up to 4, in order), with their public addresses,
  // from the review_photos table (ticket 113). `db` decides who is asking:
  // the backend's own login for public pages (it sees photos of visible
  // reviews only), or a traveler's or admin's transaction, so Row Level
  // Security shows them only the photos of reviews they may read (044).
  async photosFor(db: Querier, reviewIds: string[]): Promise<Map<string, ReviewPhotoDto[]>> {
    const byReview = new Map<string, ReviewPhotoDto[]>();
    if (reviewIds.length === 0) return byReview;
    const rows = (await db.query(
      `select id, review_id, photo_path, position
         from public.review_photos
        where review_id = any($1::uuid[])
        order by review_id, position`,
      [reviewIds],
    )) as { id: string; review_id: string; photo_path: string; position: number }[];
    for (const row of rows) {
      const list = byReview.get(row.review_id) ?? [];
      list.push({ id: row.id, url: this.supabase.publicFileUrl(BUCKET, row.photo_path), position: row.position });
      byReview.set(row.review_id, list);
    }
    return byReview;
  }

  // Where a review's files are kept, to delete them after the review is
  // deleted: its photo rows.
  async pathsOf(db: Querier, reviewId: string): Promise<string[]> {
    const rows = (await db.query(
      'select photo_path from public.review_photos where review_id = $1',
      [reviewId],
    )) as { photo_path: string }[];
    return rows.map((row) => row.photo_path);
  }
}
