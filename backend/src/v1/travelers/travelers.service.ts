import { Injectable, Logger, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

// One review as it shows on a traveler's profile: the review, the place it
// is about (with its name, so the page can link to it) and its "Helpful"
// count.
export interface ProfileReview {
  id: string;
  rating: number;
  comment: string;
  created_at: string;
  place_type: 'destination' | 'accommodation';
  place_id: string;
  place_name: string | null;
  helpful_count: number;
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

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async profile(id: string): Promise<TravelerProfile> {
    let rows: (ProfileReview & { reviewer_name: string; traveler_type: string | null })[];
    try {
      // $1 travels separately from the SQL text, so the id can never
      // change the query. The place name comes from whichever table the
      // review's place_type points at.
      rows = await this.dataSource.query(
        `select r.id, r.rating, r.comment, r.created_at, r.place_type, r.place_id,
                r.reviewer_name, r.traveler_type,
                coalesce(d.name, a.name) as place_name,
                (select count(*)::int from public.review_likes l where l.review_id = r.id) as helpful_count
           from public.reviews r
           left join public.destinations d on r.place_type = 'destination' and d.id = r.place_id
           left join public.accommodations a on r.place_type = 'accommodation' and a.id = r.place_id
          where r.user_id = $1
          order by r.created_at desc`,
        [id],
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
      })),
    };
  }
}

