import { HttpException, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import type { QueryRunner } from 'typeorm';
import { TravelerTransactions } from '../traveler-transactions';

// One notification as the website gets it (thread care round, ticket 102).
export interface NotificationDto {
  id: string;
  // 'review_reply' (someone replied to your review), 'reply_answer'
  // (someone answered your reply), and since ticket 106 'review_like' /
  // 'reply_like' (someone marked your review / reply Helpful).
  kind: 'review_reply' | 'reply_answer' | 'review_like' | 'reply_like';
  actor_name: string;
  place_type: 'destination' | 'accommodation';
  place_id: string;
  place_name: string;
  // The review the conversation is under, so the bell can open the place
  // page at that review (ticket 103).
  review_id: string;
  // The reply it is about (the new reply, or the liked one), or null for
  // a Helpful mark on the review itself: the bell opens the page at it.
  reply_id: string | null;
  read: boolean;
  created_at: Date;
}

export interface NotificationList {
  notifications: NotificationDto[];
  unread_count: number;
}

// How many notifications the bell shows at most.
const LIMIT = 20;

// How many of the traveler's notifications are unread, inside the same
// transaction (so it counts a change just made).
const unreadCount = async (runner: QueryRunner) => {
  const [row]: { count: number }[] = await runner.query(
    // Joined to reviews like the list below, so a notification under a
    // review the team hid (ticket 109) is not counted when it cannot be
    // shown (code review 2026-11-09: the bell showed a number with nothing
    // to click).
    `select count(*)::int as count
       from public.notifications n
       join public.reviews r on r.id = n.review_id
      where n.user_id = auth.uid() and n.read_at is null`,
  );
  return row.count;
};

// The logged-in traveler's notifications (supabase/sql/035). Read AS the
// traveler (TravelerTransactions), so Row Level Security only ever lets
// them see their own; the "user_id = auth.uid()" below says the same thing
// again. Every value travels as a parameter.
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly travelerTransactions: TravelerTransactions) {}

  // Their newest notifications (up to 20), each with the place the
  // conversation is on, and how many are unread in all.
  list(accessToken: string): Promise<NotificationList> {
    return this.travelerTransactions.run(
      accessToken,
      async (runner) => {
        const notifications: NotificationDto[] = await runner.query(
          `select n.id, n.kind, n.actor_name, r.place_type, r.place_id,
                  coalesce(d.name, a.name, 'a place') as place_name, n.review_id, n.reply_id,
                  n.read_at is not null as read, n.created_at
              from public.notifications n
              join public.reviews r on r.id = n.review_id
              left join public.destinations d
                      on r.place_type = 'destination' and d.id = r.place_id
              left join public.accommodations a
                      on r.place_type = 'accommodation' and a.id = r.place_id
              where n.user_id = auth.uid()
            order by n.created_at desc
            limit $1`,
          [LIMIT],
        );
        return { notifications, unread_count: await unreadCount(runner) };
      },
      (error) => this.toHttpError(error),
    );
  }

  // Marks one of the traveler's notifications read (ticket 103), or all of
  // them when id is null, and answers how many are still unread. Only
  // read_at can change, and only on their own notifications (035), so
  // someone else's id simply changes nothing.
  markRead(accessToken: string, id: string | null): Promise<{ unread_count: number }> {
    return this.travelerTransactions.run(
      accessToken,
      async (runner) => {
        await runner.query(
          `update public.notifications
              set read_at = now()
            where user_id = auth.uid()
              and read_at is null
              and ($1::uuid is null or id = $1::uuid)`,
          [id],
        );
        return { unread_count: await unreadCount(runner) };
      },
      (error) => this.toHttpError(error),
    );
  }

  private toHttpError(error: unknown) {
    if (error instanceof HttpException) return error;
    this.logger.error(`Could not read or update notifications: ${String(error)}`);
    return new ServiceUnavailableException('Could not load your notifications right now.');
  }
}
