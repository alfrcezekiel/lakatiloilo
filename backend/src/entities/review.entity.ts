import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

// The reviews table (supabase/sql/020, 021, 022). The database fills in
// user_id, reviewer_name, traveler_type and the dates itself, from the
// traveler's account; the backend never sends them.
@Entity('reviews')
export class Review {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // "destination" or "accommodation"
  @Column()
  place_type: string;

  @Column('uuid')
  place_id: string;

  @Column('uuid')
  user_id: string;

  @Column()
  reviewer_name: string;

  // "local", "domestic" or "foreign"; null for older accounts.
  @Column({ type: 'text', nullable: true })
  traveler_type: string | null;

  @Column('smallint')
  rating: number;

  @Column()
  comment: string;

  // Its photos are in the review_photos table (up to 4, supabase/sql/044);
  // the old single photo_path column is gone (046).

  // Where its video is in the review-videos bucket, or null (ticket 165,
  // supabase/sql/065).
  @Column({ type: 'text', nullable: true })
  video_path: string | null;

  @Column('timestamptz')
  created_at: Date;

  @Column('timestamptz')
  updated_at: Date;
}
