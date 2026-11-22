import { randomUUID } from 'crypto';
import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';
import { ReviewPhotosService, type UploadedPhoto } from '../reviews/review-photos.service';
import type { AdminPlaceType } from './place-changes';

const BUCKET = 'place-photos';

// A place's photo in Supabase Storage (full admin management round, ticket
// 119). Files go into the place-photos bucket as
// "<destination|accommodation>/<place id>/<random>.<webp|jpg|png>".
// Every upload and delete is made AS the logged-in admin (their login is
// sent to Storage), so the Storage policies in supabase/sql/049 decide:
// only admins may add or delete. The backend never uses the service_role
// key.
@Injectable()
export class PlacePhotosService {
  private readonly logger = new Logger(PlacePhotosService.name);

  constructor(
    private readonly supabase: SupabaseService,
    // For its check of the file's real type and size and its WebP saving
    // (shared with review photos: JPG, PNG or WebP up to 2 MB).
    private readonly reviewPhotos: ReviewPhotosService,
  ) {}

  // Throws 400 "Please choose a JPG, PNG or WebP photo up to 2 MB." for a
  // wrong file, judged from its first bytes, not its name.
  check(photo: UploadedPhoto) {
    return this.reviewPhotos.check(photo);
  }

  // Uploads the photo and answers its public address. A JPG or PNG is
  // saved as a smaller WebP that looks the same (ticket 164), the same way
  // as review photos.
  async upload(accessToken: string, type: AdminPlaceType, placeId: string, photo: UploadedPhoto) {
    const kind = this.check(photo);
    const stored = await this.reviewPhotos.toStored(photo, kind);
    const path = `${type}/${placeId}/${randomUUID()}.${stored.extension}`;
    const { error } = await this.supabase
      .travelerClient(accessToken)
      .storage.from(BUCKET)
      .upload(path, stored.buffer, { contentType: stored.contentType, upsert: false });
    if (error) {
      this.logger.error(`Could not upload a place photo: ${error.message}`);
      throw new ServiceUnavailableException("We couldn't save the photo. Please try again.");
    }
    return this.supabase.publicFileUrl(BUCKET, path);
  }

  // Deletes an uploaded place photo by its public address. Addresses that
  // are not in this bucket (the older Wikimedia and Unsplash photos) are
  // left alone. Never fails the request: a leftover file is only logged.
  async remove(accessToken: string, photoUrl: string | null | undefined) {
    const prefix = this.supabase.publicFileUrl(BUCKET, '');
    if (!photoUrl || !photoUrl.startsWith(prefix)) return;
    const path = decodeURIComponent(photoUrl.slice(prefix.length));
    try {
      const { error } = await this.supabase.travelerClient(accessToken).storage.from(BUCKET).remove([path]);
      if (error) this.logger.warn(`Could not delete place photo ${path}: ${error.message}`);
    } catch (error) {
      this.logger.warn(`Could not delete place photo ${path}: ${String(error)}`);
    }
  }
}
