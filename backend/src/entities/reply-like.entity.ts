import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  type SelectQueryBuilder,
} from 'typeorm';
import { ReviewReply } from './review-reply.entity';

// The reply_likes table (supabase/sql/032, profile & replies round, ticket
// 96): one row per traveler who marked a reply "Helpful". The same as
// ReviewLike, but for replies: reply_id and user_id together identify a
// like, so a traveler can mark a reply only once.
//
// insert: false / update: false on user_id and created_at: the database
// fills them in from the login, and 032 only lets travelers send reply_id
// ("grant insert (reply_id)"), so TypeORM must never name them when saving.
@Entity('reply_likes')
export class ReplyLike {
  @PrimaryColumn('uuid')
  reply_id: string;

  @PrimaryColumn({ type: 'uuid', insert: false, update: false })
  user_id: string;

  @Column({ type: 'timestamptz', insert: false, update: false })
  created_at: Date;

  // The reply this like belongs to. The database removes likes together
  // with their reply ("on delete cascade" in 032); synchronize is off, so
  // this only describes that link.
  @ManyToOne(() => ReviewReply, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'reply_id' })
  reply: ReviewReply;
}

// How many travelers found a reply helpful, as a sub-query for TypeORM's
// query builder, like helpfulCountOf for reviews. replyAlias is always a
// fixed name written in the code, never a value from a request.
export const replyHelpfulCountOf =
  (replyAlias: string) =>
  (subQuery: SelectQueryBuilder<unknown>): SelectQueryBuilder<unknown> =>
    subQuery
      .select('CAST(COUNT(*) AS int)')
      .from(ReplyLike, 'rl')
      .where(`rl.reply_id = ${replyAlias}.id`);
