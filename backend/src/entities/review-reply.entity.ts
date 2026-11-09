import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { Review } from './review.entity';

// The review_replies table (supabase/sql/025, review extras round, ticket
// 79): one reply under a review.
//
// Travelers may send only three columns: review_id and comment (025,
// "grant insert (review_id, comment)") and parent_reply_id (028).
// Everything else is filled in by the database: id (gen_random_uuid),
// user_id (from the login), replier_name and traveler_type (copied from
// the account by the trigger) and created_at.
// So those columns are insert: false, and TypeORM never names them when
// saving; if it did, even with DEFAULT, the database would refuse the reply.
// Editing (ticket 95, supabase/sql/031): the writer may change only the
// comment, so every other column is update: false. updated_at is set by
// the database when the comment changes. Deleting goes through the
// database's delete_own_reply function (034).
@Entity('review_replies')
export class ReviewReply {
  @PrimaryColumn({ type: 'uuid', insert: false, update: false })
  id: string;

  @Column({ type: 'uuid', update: false })
  review_id: string;

  // Empty (null) once the reply is "This reply was deleted": deleting
  // forgets the writer (supabase/sql/037).
  @Column({ type: 'uuid', nullable: true, insert: false, update: false })
  user_id: string | null;

  @Column({ type: 'text', insert: false, update: false })
  replier_name: string;

  // "local", "domestic" or "foreign"; null for accounts without one.
  @Column({ type: 'text', nullable: true, insert: false, update: false })
  traveler_type: string | null;

  @Column({ type: 'text' })
  comment: string;

  // The reply this one answers, or null when it answers the review
  // (threaded replies round, 028). Must be under the same review (the
  // database checks it). Deleting that reply leaves "This reply was
  // deleted" in its place, so this one stays (034).
  @Column({ type: 'uuid', nullable: true, update: false })
  parent_reply_id: string | null;

  @Column({ type: 'timestamptz', insert: false, update: false })
  created_at: Date;

  // When the writer last edited the text, or null if never (031).
  @Column({ type: 'timestamptz', nullable: true, insert: false, update: false })
  updated_at: Date | null;

  // When the writer deleted it, or null (thread care round, ticket 100,
  // supabase/sql/034). A deleted reply that still has answers stays as
  // "This reply was deleted", with its text, name and type cleared. Only
  // the database's delete_own_reply function sets it.
  @Column({ type: 'timestamptz', nullable: true, insert: false, update: false })
  deleted_at: Date | null;

  // The review this reply is under. The database removes replies together
  // with their review ("on delete cascade" in 025); synchronize is off, so
  // this only describes that link.
  @ManyToOne(() => Review, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'review_id' })
  review: Review;
}
