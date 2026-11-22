import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { SupabaseService } from '../../src/supabase/supabase.service';
import { TravelerTransactions } from '../../src/v1/traveler-transactions';
import { ReviewVideosService, VIDEO_MESSAGE } from '../../src/v1/reviews/review-videos.service';
import { fakeSupabase } from '../fakes/supabase.fake';
import { TOKENS, TRAVELER_ID } from '../fixtures/people';

// Ticket 165: attaching and removing a review's video, with a pretend
// Supabase (its Storage only answers what the test puts in it, and records
// deletes) and a pretend transaction (the "database" answers the review's
// current video_path, or nothing for someone else's review). Nothing talks
// to the hosted project.

const REVIEW = '55555555-5555-4555-8555-555555555555';
const MB = 1024 * 1024;
const own = (name = '66666666-6666-4666-8666-666666666666.mp4') => `${TRAVELER_ID}/${name}`;

type StoredFile = { name: string; metadata: { size: number; mimetype: string } };

async function setUp({ files = [] as StoredFile[], review = { video_path: null as string | null } as { video_path: string | null } | null } = {}) {
  const removed: string[] = [];
  const queries: { sql: string; params: unknown[] }[] = [];
  const supabase = {
    ...fakeSupabase(),
    travelerClient: () => ({
      storage: {
        from: () => ({
          list: async (_folder: string, options: { search: string }) => ({
            data: files.filter((f) => f.name === options.search),
            error: null,
          }),
          remove: async (paths: string[]) => {
            removed.push(...paths);
            return { error: null };
          },
        }),
      },
    }),
  };
  const runner = {
    query: async (sql: string, params: unknown[]) => {
      queries.push({ sql, params });
      if (sql.startsWith('select video_path')) return review ? [review] : [];
      return [[], 1];
    },
  };
  const transactions = {
    run: async <T>(_token: string, work: (r: unknown) => Promise<T>, toError: (e: unknown) => Error) => {
      try {
        return await work(runner);
      } catch (error) {
        throw toError(error);
      }
    },
  };
  const testingModule = await Test.createTestingModule({
    providers: [
      ReviewVideosService,
      { provide: SupabaseService, useValue: supabase },
      { provide: TravelerTransactions, useValue: transactions },
    ],
  }).compile();
  return { videos: testingModule.get(ReviewVideosService), removed, queries };
}

const mp4 = (size: number, name = '66666666-6666-4666-8666-666666666666.mp4'): StoredFile => ({
  name,
  metadata: { size, mimetype: 'video/mp4' },
});

describe('review videos (ticket 165)', () => {
  it('attaches an uploaded MP4 in the traveler\'s own folder and answers its address', async () => {
    const { videos, queries } = await setUp({ files: [mp4(12 * MB)] });

    const answer = await videos.attach(TOKENS.traveler, REVIEW, own());

    expect(answer.video_url).toBe(`https://storage.example.test/review-videos/${own()}`);
    expect(queries.some((q) => q.sql.startsWith('update public.reviews set video_path = $1') && q.params[0] === own())).toBe(true);
  });

  it('accepts a MOV from an iPhone and a WebM', async () => {
    for (const [ext, mimetype] of [['mov', 'video/quicktime'], ['webm', 'video/webm']]) {
      const name = `66666666-6666-4666-8666-666666666666.${ext}`;
      const { videos } = await setUp({ files: [{ name, metadata: { size: 5 * MB, mimetype } }] });

      await expect(videos.attach(TOKENS.traveler, REVIEW, own(name))).resolves.toHaveProperty('video_url');
    }
  });

  it('replaces an older video and deletes the old file', async () => {
    const old = own('77777777-7777-4777-8777-777777777777.webm');
    const { videos, removed } = await setUp({ files: [mp4(3 * MB)], review: { video_path: old } });

    await videos.attach(TOKENS.traveler, REVIEW, own());

    expect(removed).toEqual([old]);
  });

  it('answers 404 when the file is not in Storage', async () => {
    const { videos } = await setUp({ files: [] });

    await expect(videos.attach(TOKENS.traveler, REVIEW, own())).rejects.toThrow(NotFoundException);
  });

  it('refuses a video over 50 MB or of another type with the usual message, and deletes the file', async () => {
    for (const file of [mp4(50 * MB + 1), { name: '66666666-6666-4666-8666-666666666666.mp4', metadata: { size: MB, mimetype: 'image/png' } }]) {
      const { videos, removed, queries } = await setUp({ files: [file] });

      await expect(videos.attach(TOKENS.traveler, REVIEW, own())).rejects.toThrow(new BadRequestException(VIDEO_MESSAGE));
      expect(removed).toEqual([own()]);
      expect(queries).toHaveLength(0);
    }
  });

  it("answers 404 for someone else's review, and saves nothing", async () => {
    const { videos, queries } = await setUp({ files: [mp4(MB)], review: null });

    await expect(videos.attach(TOKENS.traveler, REVIEW, own())).rejects.toThrow("We couldn't find that review among yours");
    expect(queries.some((q) => q.sql.startsWith('update'))).toBe(false);
  });

  it('removes the video from the review and deletes the file', async () => {
    const old = own();
    const { videos, removed, queries } = await setUp({ review: { video_path: old } });

    await videos.detach(TOKENS.traveler, REVIEW);

    expect(queries.some((q) => q.sql.startsWith('update public.reviews set video_path = null'))).toBe(true);
    expect(removed).toEqual([old]);
  });
});
