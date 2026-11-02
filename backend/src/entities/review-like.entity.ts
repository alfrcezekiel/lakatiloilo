import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  type SelectQueryBuilder,
} from 'typeorm';
import { Review } from './review.entity';

// The review_likes table (supabase/sql/024): one row per traveler who
// marked a review "Helpful" (profiles & likes round; described to TypeORM
// in the likes on TypeORM round, ticket 76). review_id and user_id together
// identify a like, so a traveler can mark a review only once.
//
// insert: false / update: false on user_id and created_at: the database
// fills them in from the login (user_id defaults to auth.uid()), and 024
// only lets travelers send review_id ("grant insert (review_id)"). If
// TypeORM named these columns in an insert, even with DEFAULT, the database
// would refuse every like. So TypeORM never sends them; it only reads them.
@Entity('review_likes')
export class ReviewLike {
  @PrimaryColumn('uuid')
  review_id: string;

  @PrimaryColumn({ type: 'uuid', insert: false, update: false })
  user_id: string;

  @Column({ type: 'timestamptz', insert: false, update: false })
  created_at: Date;

  // The review this like belongs to. The database removes likes together
  // with their review ("on delete cascade" in 024); synchronize is off, so
  // this only describes that link, it never changes the table.
  @ManyToOne(() => Review, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'review_id' })
  review: Review;
}

// How many travelers found a review helpful, as a sub-query for TypeORM's
// query builder: .addSelect(helpfulCountOf('r'), 'helpful_count'), where
// 'r' is the review's alias in the outer query. Reviews (GET /v1/reviews)
// and profiles (GET /v1/travelers/:id) both use it, so they always count
// likes the same way. reviewAlias is always a fixed name written in the
// code, never a value from a request.
export const helpfulCountOf =
  (reviewAlias: string) =>
  (subQuery: SelectQueryBuilder<unknown>): SelectQueryBuilder<unknown> =>
    subQuery
      .select('CAST(COUNT(*) AS int)')
      .from(ReviewLike, 'l')
      .where(`l.review_id = ${reviewAlias}.id`);
