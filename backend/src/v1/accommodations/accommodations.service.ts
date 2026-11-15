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
import { Accommodation } from '../../entities/accommodation.entity';

// Talks to the accommodations table. The controller calls these methods.
@Injectable()
export class AccommodationsService {
  constructor(
    @InjectRepository(Accommodation)
    private readonly accommodationsRepository: Repository<Accommodation>,
  ) {}

  // The filter is optional. TypeORM sends it as a query parameter,
  // never glued into the SQL text, so user input cannot change the query.
  async findAll(type?: string): Promise<WithAllowedPhoto<Accommodation>[]> {
    const where: FindOptionsWhere<Accommodation> = {};
    if (type) where.type = type;

    const places = await this.accommodationsRepository.find({
      where,
      order: { name: 'ASC' },
    });
    // Ticket 138: no photo until its credits are allowed.
    return withAllowedPhotos(this.accommodationsRepository.manager, 'accommodation', places);
  }

  // Rows within near.radiusKm of the point, nearest first, each with
  // distance_km. The optional type filter narrows the results further.
  async findNear(near: NearParams, type?: string) {
    const qb = applyNear(
      this.accommodationsRepository.createQueryBuilder('accommodation'),
      'accommodation',
      near,
    );
    if (type) qb.andWhere('accommodation.type = :type', { type });
    return withAllowedPhotos(this.accommodationsRepository.manager, 'accommodation', await withDistance(qb));
  }

  // One accommodation, with its photo's credit line (ticket 135), or null
  // when the photo has no allowed credits yet (ticket 138).
  async findOne(
    id: string,
  ): Promise<
    WithAllowedPhoto<Accommodation> & { photo_credit: PublicPhotoCredit | null; photos: PublicPlacePhoto[] }
  > {
    const accommodation = await this.accommodationsRepository.findOneBy({ id });
    if (!accommodation) {
      throw new NotFoundException("We couldn't find that accommodation.");
    }
    const photo_credit = await photoCreditOf(this.accommodationsRepository.manager, 'accommodation', id);
    // Ticket 138: the photo only with allowed credits; otherwise the
    // website shows the splash art (and no credit line).
    return { ...accommodation, photo_url: photo_credit ? accommodation.photo_url : null,
      photo_credit,
      // Its other allowed photos, for the row under the top photo (ticket 146).
      photos: await morePhotosOf(this.accommodationsRepository.manager, 'accommodation', id),
    };
  }
}
