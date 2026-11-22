import { Test } from '@nestjs/testing';
import { TravelerTransactions } from '../../src/v1/traveler-transactions';
import { AdminOverviewService, STORAGE_LIMIT_BYTES } from '../../src/v1/admin/admin-overview.service';
import { TOKENS } from '../fixtures/people';

// Ticket 167: the Overview's storage line, with a pretend transaction (no
// hosted database). The refusals (no login 401, a traveler 403) are in
// refusals.e2e-spec.ts, which covers every /v1/admin route.

const MB = 1024 * 1024;

async function setUp(storageAnswer: () => unknown) {
  const queries: string[] = [];
  const runner = {
    query: async (sql: string) => {
      queries.push(sql.trim().split('\n')[0]);
      if (sql.includes('admin_storage_used')) return [{ storage: storageAnswer() }];
      if (sql.includes('reviews_this_week')) {
        return [{ reviews_this_week: 1, reports_waiting: 0, reported_reviews: 0, hidden_reviews: 0, places: 3 }];
      }
      return [];
    },
  };
  const testingModule = await Test.createTestingModule({
    providers: [
      AdminOverviewService,
      {
        provide: TravelerTransactions,
        useValue: { run: async (_t: string, work: (r: unknown) => Promise<unknown>) => work(runner) },
      },
    ],
  }).compile();
  return { overview: testingModule.get(AdminOverviewService), queries };
}

describe('storage used on the Overview (ticket 167)', () => {
  it('answers the total across every bucket against 1 GB, and each of our three buckets', async () => {
    // Postgres sends bigint sums as text.
    const { overview } = await setUp(() => ({
      total: String(312 * MB),
      place_photos: String(40 * MB),
      review_photos: String(22 * MB),
      review_videos: String(250 * MB),
    }));

    const answer = await overview.overview(TOKENS.admin);

    expect(answer.storage).toEqual({
      used_bytes: 312 * MB,
      limit_bytes: STORAGE_LIMIT_BYTES,
      place_photos_bytes: 40 * MB,
      review_photos_bytes: 22 * MB,
      review_videos_bytes: 250 * MB,
    });
    expect(answer.places).toBe(3);
  });

  it('still answers the rest of the Overview when storage cannot be read, undoing only that step', async () => {
    const { overview, queries } = await setUp(() => {
      throw new Error('function admin_storage_used() does not exist');
    });

    const answer = await overview.overview(TOKENS.admin);

    expect(answer.storage).toBeNull();
    expect(answer.reviews_this_week).toBe(1);
    expect(queries).toContain('rollback to savepoint storage_used');
  });
});
