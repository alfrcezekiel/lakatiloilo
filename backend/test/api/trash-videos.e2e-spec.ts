import { Test } from '@nestjs/testing';
import { SupabaseService } from '../../src/supabase/supabase.service';
import { TravelerTransactions } from '../../src/v1/traveler-transactions';
import { AdminTrashService } from '../../src/v1/admin/admin-trash.service';
import { PlacePhotosService } from '../../src/v1/admin/place-photos.service';
import { ReviewPhotosService } from '../../src/v1/reviews/review-photos.service';
import { fakeSupabase } from '../fakes/supabase.fake';
import { TOKENS } from '../fixtures/people';

// Ticket 166: a review deleted for good — by "Delete for good" or after 30
// days in the Trash — also has its video file removed. The pretend
// transaction answers the Trash's video list (066) before and after the
// delete; the pretend Storage records what is deleted. Nothing talks to the
// hosted project.

type Row = { review_id: string; video_path: string };

async function setUp(videoListsInOrder: Row[][], deleteAnswer: Record<string, unknown>) {
  const deletedVideos: string[] = [];
  let listCall = 0;
  const runner = {
    query: async (sql: string) => {
      if (sql.includes('admin_trashed_review_videos')) return videoListsInOrder[listCall++] ?? [];
      if (sql.includes('admin_delete_review_for_good')) return [{ paths: deleteAnswer.paths ?? null }];
      if (sql.includes('admin_delete_reply_for_good')) return [{ outcome: deleteAnswer.outcome ?? null }];
      if (sql.includes('admin_delete_place_for_good')) return [{ files: deleteAnswer.files ?? null }];
      if (sql.includes('admin_empty_expired_trash')) return [{ expired: { photo_urls: [], review_photo_paths: [] } }];
      return [];
    },
  };
  const supabase = {
    ...fakeSupabase(),
    travelerClient: () => ({
      storage: {
        from: (bucket: string) => ({
          remove: async (paths: string[]) => {
            if (bucket === 'review-videos') deletedVideos.push(...paths);
            return { error: null };
          },
        }),
      },
    }),
  };
  const testingModule = await Test.createTestingModule({
    providers: [
      AdminTrashService,
      { provide: SupabaseService, useValue: supabase },
      { provide: PlacePhotosService, useValue: { remove: async () => undefined } },
      { provide: ReviewPhotosService, useValue: { remove: async () => undefined } },
      {
        provide: TravelerTransactions,
        useValue: { run: async (_t: string, work: (r: unknown) => Promise<unknown>) => work(runner) },
      },
    ],
  }).compile();
  return { trash: testingModule.get(AdminTrashService), deletedVideos, listCalls: () => listCall };
}

const A: Row = { review_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', video_path: 'u1/a.mp4' };
const B: Row = { review_id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', video_path: 'u2/b.webm' };
const C: Row = { review_id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', video_path: 'u3/c.mov' };

describe('review videos and the Trash (ticket 166)', () => {
  it('deleting a review for good removes exactly its video, not the other videos in the Trash', async () => {
    const { trash, deletedVideos } = await setUp([[A, B], [B]], { paths: [] });

    await trash.deleteForGood(TOKENS.admin, 'review', A.review_id);

    expect(deletedVideos).toEqual([A.video_path]);
  });

  it('deleting a place for good removes the videos of the reviews that went with it', async () => {
    const { trash, deletedVideos } = await setUp([[A, B, C], [C]], {
      files: { photo_urls: [], review_photo_paths: [] },
    });

    await trash.deleteForGood(TOKENS.admin, 'place', 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'destination');

    expect(deletedVideos.sort()).toEqual([A.video_path, B.video_path].sort());
  });

  it('deleting a reply for good removes no video and does not ask for the list', async () => {
    const { trash, deletedVideos, listCalls } = await setUp([], { outcome: 'deleted' });

    await trash.deleteForGood(TOKENS.admin, 'reply', A.review_id);

    expect(deletedVideos).toEqual([]);
    expect(listCalls()).toBe(0);
  });

  it('the 30-day cleanup when the Trash opens removes the videos of the reviews it deleted', async () => {
    const { trash, deletedVideos } = await setUp([[A, B], [A]], {});

    await trash.list(TOKENS.admin);

    expect(deletedVideos).toEqual([B.video_path]);
  });

  it('nothing deleted, nothing removed', async () => {
    const { trash, deletedVideos } = await setUp([[A], [A]], {});

    await trash.list(TOKENS.admin);

    expect(deletedVideos).toEqual([]);
  });
});
