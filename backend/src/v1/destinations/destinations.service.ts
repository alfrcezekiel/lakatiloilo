import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import {
  morePhotosOf,
  photoCreditOf,
  withAllowedPhotos,
  type PublicPhotoCredit,
  type PublicPlacePhoto,
  type WithAllowedPhoto,
} from '../public-photo-credit';
import { NearParams, applyNear, withDistance } from '../near-query';
import { Destination } from '../../entities/destination.entity';

// Talks to the destinations table. The controller calls these methods.
@Injectable()
export class DestinationsService {
  constructor(
    @InjectRepository(Destination)
    private readonly destinationsRepository: Repository<Destination>,
  ) {}

  // Both filters are optional. TypeORM sends them as query parameters,
  // never glued into the SQL text, so user input cannot change the query.
  async findAll(category?: string, locationType?: string): Promise<WithAllowedPhoto<Destination>[]> {
    const where: FindOptionsWhere<Destination> = {};
    if (category) where.category = category;
    if (locationType) where.location_type = locationType;

    const places = await this.destinationsRepository.find({
      where,
      order: { name: 'ASC' },
    });
    // Ticket 138: no photo until its credits are allowed.
    return withAllowedPhotos(this.destinationsRepository.manager, 'destination', places);
  }

  // Rows within near.radiusKm of the point, nearest first, each with
  // distance_km. The optional category filter narrows the results further.
  async findNear(near: NearParams, category?: string) {
    const qb = applyNear(
      this.destinationsRepository.createQueryBuilder('destination'),
      'destination',
      near,
    );
    if (category) qb.andWhere('destination.category = :category', { category });
    return withAllowedPhotos(this.destinationsRepository.manager, 'destination', await withDistance(qb));
  }

  // One destination, with its photo's credit line (ticket 135), or null
  // when the photo has no allowed credits yet (ticket 138).
  async findOne(
    id: string,
  ): Promise<
    WithAllowedPhoto<Destination> & { photo_credit: PublicPhotoCredit | null; photos: PublicPlacePhoto[] }
  > {
    const destination = await this.destinationsRepository.findOneBy({ id });
    if (!destination) {
      throw new NotFoundException("We couldn't find that destination.");
    }
    const photo_credit = await photoCreditOf(this.destinationsRepository.manager, 'destination', id);
    // Ticket 138: the photo only with allowed credits; otherwise the
    // website shows the splash art (and no credit line).
    return { ...destination, photo_url: photo_credit ? destination.photo_url : null,
      photo_credit,
      // Its other allowed photos, for the row under the top photo (ticket 146).
      photos: await morePhotosOf(this.destinationsRepository.manager, 'destination', id),
    };
  }
}
