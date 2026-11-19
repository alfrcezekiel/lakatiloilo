import { describe, expect, it, jest } from '@jest/globals';
import type { QueryRunner, Repository } from 'typeorm';
import type { Review } from '../../entities/review.entity';
import type { SupabaseService } from '../../supabase/supabase.service';
import { TravelerTransactions } from '../traveler-transactions';
import { ReviewsService, type NewReview } from './reviews.service';
import type { ReviewPhotosService } from './review-photos.service';

describe('ReviewsService authenticated writes', () => {
  it('does not accept client-supplied ownership or profile fields when creating a review', async () => {
    const storedReview = {
      id: '33333333-3333-4333-8333-333333333333',
      user_id: '11111111-1111-4111-8111-111111111111',
      reviewer_name: 'Trusted display name',
      traveler_type: 'local',
      rating: 5,
      comment: 'A lovely place.',
      created_at: '2026-11-19T00:00:00.000Z',
    };
    const query = jest
      .fn<(sql: string, parameters?: unknown[]) => Promise<unknown[]>>()
      .mockResolvedValue([storedReview]);
    const runner = { query } as unknown as QueryRunner;
    const run = jest.fn(async (_token: string, work: (activeRunner: QueryRunner) => Promise<unknown>) =>
      work(runner),
    );
    const service = new ReviewsService(
      {} as Repository<Review>,
      { run } as unknown as TravelerTransactions,
      {} as ReviewPhotosService,
      {} as SupabaseService,
    );
    const untrustedPayload = {
      place_type: 'destination',
      place_id: '44444444-4444-4444-8444-444444444444',
      rating: 5,
      comment: 'A lovely place.',
      user_id: '22222222-2222-4222-8222-222222222222',
      reviewer_name: 'Forged admin name',
      traveler_type: 'foreign',
      email: 'attacker@example.test',
    } as NewReview;

    const created = await service.create('pretend-traveler-token', untrustedPayload);

    expect(run).toHaveBeenCalledTimes(1);
    expect(run.mock.calls[0][0]).toBe('pretend-traveler-token');
    expect(query).toHaveBeenCalledTimes(1);
    expect(query.mock.calls[0][0]).toContain(
      'insert into public.reviews (place_type, place_id, rating, comment)',
    );
    const insertStatement = query.mock.calls[0][0].split('returning')[0];
    expect(insertStatement).not.toMatch(/user_id|reviewer_name|traveler_type|email/i);
    expect(query.mock.calls[0][1]).toEqual([
      'destination',
      '44444444-4444-4444-8444-444444444444',
      5,
      'A lovely place.',
    ]);
    expect(created.user_id).toBe(storedReview.user_id);
    expect(created.reviewer_name).toBe(storedReview.reviewer_name);
    expect(created).not.toHaveProperty('email');
  });
});
