import type { Page } from "@playwright/test";

// Pretend reviews for the sorting, Show more and video flows (tickets
// 162–166). The browser gets these instead of the backend's answer, so the
// tests never depend on what real travelers wrote, and nothing is saved.

// A real place in the team's database: the page itself still loads from the
// running backend. Only its reviews are pretend.
export const PLACE_PATH = "/destinations/5d1155a1-6e40-417d-9c84-09a990cae00d";

const pad = (n: number) => String(n).padStart(2, "0");

export const reviewId = (n: number) => `aaaaaaaa-0000-4000-8000-0000000000${pad(n)}`;
export const reviewerName = (n: number) => `Biñan Traveler ${pad(n)}`;
export const reviewComment = (n: number) => `Pretend review #${pad(n)}`;

export const PRETEND_VIDEO_URL = "https://storage.example.test/review-videos/pretend/video.mp4";

export type PretendReview = {
  id: string;
  user_id: string;
  reviewer_name: string;
  traveler_type: string;
  rating: number;
  comment: string;
  created_at: string;
  helpful_count: number;
  liked_by_me: boolean;
  photos: [];
  video_url: string | null;
  replies: [];
};

// Review 1 is the newest and review 10 the oldest.
export function pretendReview(n: number, changes: Partial<PretendReview> = {}): PretendReview {
  return {
    id: reviewId(n),
    user_id: `bbbbbbbb-0000-4000-8000-0000000000${pad(n)}`,
    reviewer_name: reviewerName(n),
    traveler_type: "local",
    rating: 4,
    comment: reviewComment(n),
    created_at: `2026-11-${pad(21 - n)}T08:00:00.000Z`,
    helpful_count: 0,
    liked_by_me: false,
    photos: [],
    video_url: null,
    replies: [],
    ...changes,
  };
}

// Ten reviews. The two oldest have the most Helpful marks, so Most relevant
// and Newest give different orders. Reviews 4 and 7 have a video.
export const TEN_REVIEWS = Array.from({ length: 10 }, (_, index) => {
  const n = index + 1;
  return pretendReview(n, {
    helpful_count: n === 10 ? 9 : n === 9 ? 5 : 0,
    video_url: n === 4 || n === 7 ? PRETEND_VIDEO_URL : null,
  });
});

// Answers "what are this place's reviews?" with the given list. Call it
// after pretendLogin, because Playwright tries the newest route first.
export async function answerReviews(page: Page, reviews: PretendReview[]) {
  await page.route(/\/api\/v1\/reviews\?/, (route) =>
    route.request().method() === "GET" ? route.fulfill({ json: reviews }) : route.fallback(),
  );
}
