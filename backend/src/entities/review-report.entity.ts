import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { Review } from './review.entity';

// The reasons a traveler can give, the same list as the "check" in 026.
export const REPORT_REASONS = ['spam', 'offensive', 'not_about_place', 'other'] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

// The review_reports table (supabase/sql/026, review extras round, ticket
// 80): one report of a review by one traveler.
//
// 026 only lets travelers send review_id, reason and note ("grant insert
// (review_id, reason, note)"), and lets nobody read reports through the
// app. id, user_id and created_at are filled in by the database, so they
// are insert: false and TypeORM never names them. update: false
// everywhere: nobody may edit a report.
@Entity('review_reports')
export class ReviewReport {
  @PrimaryColumn({ type: 'uuid', insert: false, update: false })
  id: string;

  @Column({ type: 'uuid', update: false })
  review_id: string;

  @Column({ type: 'uuid', insert: false, update: false })
  user_id: string;

  @Column({ type: 'text', update: false })
  reason: ReportReason;

  // Optional, up to 300 characters.
  @Column({ type: 'text', nullable: true, update: false })
  note: string | null;

  @Column({ type: 'timestamptz', insert: false, update: false })
  created_at: Date;

  // The reported review. The database removes reports together with their
  // review ("on delete cascade" in 026); synchronize is off, so this only
  // describes that link.
  @ManyToOne(() => Review, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'review_id' })
  review: Review;
}
