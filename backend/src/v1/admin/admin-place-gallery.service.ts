import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { QueryFailedError, type QueryRunner } from 'typeorm';
import { httpErrorFrom } from '../database-errors';
import { TravelerTransactions } from '../traveler-transactions';
import type { UploadedPhoto } from '../reviews/review-photos.service';
import { AdminPlacesService } from './admin-places.service';
import { PlacePhotosService } from './place-photos.service';
import { saveCredits, type PhotoCredits } from './photo-credits';
import { placeNotFound, type AdminPlaceDetails, type AdminPlaceType } from './place-changes';

// More than one photo per place (admin extras round, ticket 144). A place
// has up to 6 photos (place_photos, supabase/sql/059), each with its own
// credits; photo 1 is the cover, which Edit's "replace photo" and the
// cover's credits box keep handling as before. Everything runs AS the
// signed-in admin, so Row Level Security decides (only admins).

export const MAX_PLACE_PHOTOS = 6;
const tooMany = () =>
  new BadRequestException(`A place can have up to ${MAX_PLACE_PHOTOS} photos. Delete one first.`);
const photoNotFound = () => new NotFoundException("We couldn't find that photo.");

@Injectable()
export class AdminPlaceGalleryService {
  private readonly logger = new Logger(AdminPlaceGalleryService.name);

  constructor(
    private readonly travelerTransactions: TravelerTransactions,
    private readonly placePhotos: PlacePhotosService,
    private readonly adminPlaces: AdminPlacesService,
  ) {}

  private asAdmin<T>(accessToken: string, work: (runner: QueryRunner) => Promise<T>): Promise<T> {
    return this.travelerTransactions.run(accessToken, work, (error) => this.toHttpError(error));
  }

  // Adds one more photo with its credits, after the last one:
  //   1. the file is checked and the place must have fewer than 6 photos,
  //   2. the file is uploaded into the place's folder,
  //   3. the photo and its credits are saved in one transaction; if that
  //      fails, the file is deleted again, so nothing is left behind.
  // Answers the place as the Edit form shows it.
  async addPhoto(
    accessToken: string,
    type: AdminPlaceType,
    id: string,
    photo: UploadedPhoto,
    credits: PhotoCredits,
  ): Promise<AdminPlaceDetails> {
    this.placePhotos.check(photo);
    const count = await this.asAdmin(accessToken, async (runner) => {
      const [place]: unknown[] = await runner.query(
        type === 'destination'
          ? 'select 1 from public.destinations where id = $1'
          : 'select 1 from public.accommodations where id = $1',
        [id],
      );
      if (!place) throw placeNotFound();
      const [{ n }]: { n: number }[] = await runner.query(
        'select count(*)::int as n from public.place_photos where place_type = $1 and place_id = $2',
        [type, id],
      );
      return n;
    });
    if (count >= MAX_PLACE_PHOTOS) throw tooMany();
    const url = await this.placePhotos.upload(accessToken, type, id, photo);
    try {
      await this.asAdmin(accessToken, async (runner) => {
        const [added]: { id: string }[] = await runner.query(
          `insert into public.place_photos (place_type, place_id, photo_url, position)
           select $1, $2, $3, coalesce(max(position), 0) + 1
             from public.place_photos where place_type = $1 and place_id = $2
           returning id`,
          [type, id, url],
        );
        await saveCredits(runner, type, id, credits, added.id);
      });
    } catch (error) {
      await this.placePhotos.remove(accessToken, url);
      throw error;
    }
    return this.adminPlaces.findOne(accessToken, type, id);
  }

  // Saves one photo's credits (any photo of the place, the cover too).
  async savePhotoCredits(
    accessToken: string,
    type: AdminPlaceType,
    id: string,
    photoId: string,
    credits: PhotoCredits,
  ): Promise<AdminPlaceDetails> {
    const saved = await this.asAdmin(accessToken, (runner) => saveCredits(runner, type, id, credits, photoId));
    if (!saved) throw photoNotFound();
    return this.adminPlaces.findOne(accessToken, type, id);
  }

  // Moves a photo to another position (ticket 145): the others shift to
  // make room, so the positions stay 1, 2, 3 … with no gap. Position 1 is
  // the cover: when it changes, the place's photo_url (the cards' photo)
  // follows, so the cover's credits and the splash rule follow too. One
  // transaction; the "one photo per position" rule (059) is checked at its
  // end, after every photo has moved.
  async movePhoto(
    accessToken: string,
    type: AdminPlaceType,
    id: string,
    photoId: string,
    position: number,
  ): Promise<AdminPlaceDetails> {
    await this.asAdmin(accessToken, async (runner) => {
      const photos = await this.photosIn(runner, type, id);
      const from = photos.findIndex((photo) => photo.id === photoId);
      if (from === -1) throw photoNotFound();
      const to = Math.min(Math.max(position, 1), photos.length) - 1;
      const [moved] = photos.splice(from, 1);
      photos.splice(to, 0, moved);
      await this.renumber(runner, type, id, photos);
    });
    return this.adminPlaces.findOne(accessToken, type, id);
  }

  // Deletes a photo with its credits (ticket 145); the ones after it move up
  // one. A place keeps at least one photo. The file is deleted from
  // Storage afterwards (older Wikimedia and Unsplash addresses are left
  // alone).
  async deletePhoto(accessToken: string, type: AdminPlaceType, id: string, photoId: string): Promise<AdminPlaceDetails> {
    const removedUrl = await this.asAdmin(accessToken, async (runner) => {
      const photos = await this.photosIn(runner, type, id);
      const photo = photos.find((p) => p.id === photoId);
      if (!photo) throw photoNotFound();
      if (photos.length === 1) {
        throw new BadRequestException('A place needs at least one photo. Add another before deleting this one.');
      }
      await runner.query('delete from public.place_photos where id = $1', [photoId]);
      await this.renumber(
        runner,
        type,
        id,
        photos.filter((p) => p.id !== photoId),
      );
      return photo.photo_url;
    });
    await this.placePhotos.remove(accessToken, removedUrl);
    return this.adminPlaces.findOne(accessToken, type, id);
  }

  // The place's photos in order (locked until the transaction ends, so two
  // admins moving photos at once take turns).
  private async photosIn(runner: QueryRunner, type: AdminPlaceType, id: string) {
    const photos: { id: string; photo_url: string }[] = await runner.query(
      `select id, photo_url from public.place_photos
        where place_type = $1 and place_id = $2 order by position for update`,
      [type, id],
    );
    if (photos.length === 0) {
      const [place]: unknown[] = await runner.query(
        type === 'destination'
          ? 'select 1 from public.destinations where id = $1'
          : 'select 1 from public.accommodations where id = $1',
        [id],
      );
      if (!place) throw placeNotFound();
    }
    return photos;
  }

  // Gives the photos positions 1, 2, 3 … in this order, then makes the
  // place's photo_url the new photo 1's address.
  private async renumber(runner: QueryRunner, type: AdminPlaceType, id: string, ordered: { id: string; photo_url: string }[]) {
    await runner.query('set constraints public.place_photos_one_per_position deferred');
    for (const [index, photo] of ordered.entries()) {
      await runner.query('update public.place_photos set position = $2 where id = $1 and position <> $2', [
        photo.id,
        index + 1,
      ]);
    }
    await runner.query(
      type === 'destination'
        ? 'update public.destinations set photo_url = $2 where id = $1 and photo_url is distinct from $2'
        : 'update public.accommodations set photo_url = $2 where id = $1 and photo_url is distinct from $2',
      [id, ordered[0].photo_url],
    );
  }

  private toHttpError(error: unknown) {
    // A seventh photo, or two added at the same moment (059: positions 1
    // to 6, one photo each).
    const constraint =
      error instanceof QueryFailedError ? (error.driverError as { constraint?: string }).constraint : undefined;
    if (constraint === 'place_photos_position_check' || constraint === 'place_photos_one_per_position') {
      return tooMany();
    }
    return httpErrorFrom(error, this.logger, 'save a place photo', {
      '23514': () => new BadRequestException('Please check the photo credits and try again.'),
      '23503': () => placeNotFound(),
    });
  }
}
