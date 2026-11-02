import { randomUUID } from 'crypto';
import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';

const BUCKET = 'review-photos';
export const MAX_PHOTO_BYTES = 2 * 1024 * 1024; // 2 MB, the same as the bucket (027)
export const PHOTO_MESSAGE = 'Please choose a JPG, PNG or WebP photo up to 2 MB.';

// What the upload handling (multer) hands over for one uploaded file. Only
// the parts used here, written out so the project needs no extra package.
export interface UploadedPhoto {
  buffer: Buffer;
  size: number;
  mimetype: string;
  originalname: string;
}

type PhotoType = { contentType: string; extension: string };

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
  // name, and answers where it is ("<user id>/<random>.<jpg|png|webp>").
  async upload(accessToken: string, photo: UploadedPhoto): Promise<string> {
    const type = this.check(photo);
    const userId = await this.supabase.userIdFor(accessToken);
    if (!userId) throw new UnauthorizedException('Please log in again, then try again.');

    const path = `${userId}/${randomUUID()}.${type.extension}`;
    const { error } = await this.supabase
      .travelerClient(accessToken)
      .storage.from(BUCKET)
      .upload(path, photo.buffer, { contentType: type.contentType, upsert: false });
    if (error) {
      this.logger.error(`Could not upload review photo: ${error.message}`);
      throw new ServiceUnavailableException("We couldn't save your photo. Please try again.");
    }
    return path;
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

  // The public address of a review's photo, or null when it has none.
  urlFor(path: string | null | undefined): string | null {
    return path ? this.supabase.publicFileUrl(BUCKET, path) : null;
  }
}
