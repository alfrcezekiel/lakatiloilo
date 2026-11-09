import { Injectable, Logger, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Accommodation } from '../../entities/accommodation.entity';
import { Destination } from '../../entities/destination.entity';
import { Review } from '../../entities/review.entity';
import { helpfulCountOf } from '../../entities/review-like.entity';
import { ReviewPhotosService, type ReviewPhotoDto } from '../reviews/review-photos.service';

// One review as it shows on a traveler's profile: the review, the place it
// is about (with its name, so the page can link to it), its "Helpful"
// count, and its photos (up to 4, in order; ticket 99, a list since
// ticket 113).
export interface ProfileReview {
  id: string;
  rating: number;
  comment: string;
  created_at: string;
  place_type: 'destination' | 'accommodation';
  place_id: string;
  place_name: string | null;
  helpful_count: number;
  photos: ReviewPhotoDto[];
}

// A traveler's public profile (profiles & likes round, ticket 73). Only
// what their reviews already show to everyone: never their email.
export interface TravelerProfile {
  id: string;
  display_name: string;
  traveler_type: string | null;
  review_count: number;
  reviews: ProfileReview[];
}

export const travelerNotFound = () => new NotFoundException("We couldn't find this traveler.");

// Builds profiles from the reviews table. A traveler's account lives in
// Supabase Auth, which the backend could only read for someone else with
// the service_role key, which this project never uses. Reviews already
// carry user_id, reviewer_name and traveler_type (copied from the account
// by the database), so a profile is built from them, and a traveler with
// no reviews has no public profile. Read through lakat_api, which may read
// reviews, likes, destinations and accommodations (016, 023, 024).
@Injectable()
export class TravelersService {
  private readonly logger = new Logger(TravelersService.name);

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly photos: ReviewPhotosService,
  ) {}

  async profile(id: string): Promise<TravelerProfile> {
    let rows: (Omit<ProfileReview, 'photos'> & {
      reviewer_name: string;
      traveler_type: string | null;
    })[];
    let photos: Map<string, ReviewPhotoDto[]>;
    try {
      // Built with TypeORM's query builder on the entities (likes on
      // TypeORM round, ticket 77), still one database request. The id
      // travels as a named parameter, so it can never change the query.
      // The place name comes from whichever table the review's place_type
      // points at; the Helpful count is a small sub-query on ReviewLike.
      rows = await this.dataSource
        .getRepository(Review)
        .createQueryBuilder('r')
        .leftJoin(Destination, 'd', "r.place_type = 'destination' AND d.id = r.place_id")
        .leftJoin(Accommodation, 'a', "r.place_type = 'accommodation' AND a.id = r.place_id")
        .select('r.id', 'id')
        .addSelect('r.rating', 'rating')
        .addSelect('r.comment', 'comment')
        .addSelect('r.created_at', 'created_at')
        .addSelect('r.place_type', 'place_type')
        .addSelect('r.place_id', 'place_id')
        .addSelect('r.reviewer_name', 'reviewer_name')
        .addSelect('r.traveler_type', 'traveler_type')
        .addSelect('COALESCE(d.name, a.name)', 'place_name')
        .addSelect(helpfulCountOf('r'), 'helpful_count')
        .where('r.user_id = :id', { id })
        .orderBy('r.created_at', 'DESC')
        .getRawMany();
      // Their photos, read the same way (only photos of visible reviews).
      photos = await this.photos.photosFor(
        this.dataSource,
        rows.map((r) => r.id),
      );
    } catch (error) {
      this.logger.error(`Could not read traveler profile: ${String(error)}`);
      throw new ServiceUnavailableException('Could not load this traveler right now.');
    }
    if (rows.length === 0) throw travelerNotFound();

    // The newest review has the traveler's current name and type (each
    // review copies them from the account when it is written).
    const newest = rows[0];
    return {
      id,
      display_name: newest.reviewer_name,
      traveler_type: newest.traveler_type,
      review_count: rows.length,
      reviews: rows.map((r) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        created_at: r.created_at,
        place_type: r.place_type,
        place_id: r.place_id,
        place_name: r.place_name,
        helpful_count: r.helpful_count,
        // Public addresses, never where they are kept in Storage, the
        // same as GET /v1/reviews.
        photos: photos.get(r.id) ?? [],
      })),
    };
  }
}

