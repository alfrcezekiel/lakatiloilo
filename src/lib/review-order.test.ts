import { describe, expect, it } from "vitest";
import type { Reply, Review } from "@/lib/api";
import { FIRST_SHOWN, MORE_STEP, orderReviews, relevance, showMore } from "./review-order";

// A review with only the fields the order looks at.
function review(id: string, created_at: string, extra: Partial<Review> = {}): Review {
  return {
    id,
    user_id: `user-${id}`,
    reviewer_name: `Traveler ${id}`,
    traveler_type: null,
    rating: 5,
    comment: "Nice",
    created_at,
    ...extra,
  };
}

const reply = (deleted = false) => ({ id: Math.random().toString(), deleted }) as unknown as Reply;
const photo = { id: "p1", url: "https://example.test/p1.webp", position: 1 };

describe("relevance", () => {
  it("adds Helpful marks and replies, leaving out replies in the Trash", () => {
    const r = review("a", "2026-11-01T00:00:00Z", { helpful_count: 3, replies: [reply(), reply(), reply(true)] });

    const score = relevance(r);

    expect(score).toBe(5);
  });
});

describe("orderReviews", () => {
  const old = review("old", "2026-10-01T00:00:00Z", { helpful_count: 9 });
  const middle = review("middle", "2026-10-15T00:00:00Z", { photos: [photo] });
  const fresh = review("fresh", "2026-11-20T00:00:00Z", { replies: [reply()] });
  const all = [middle, fresh, old];

  it("puts the most Helpful marks plus replies first for Most relevant", () => {
    const ids = orderReviews(all, "relevant").map((r) => r.id);

    expect(ids).toEqual(["old", "fresh", "middle"]);
  });

  it("breaks a Most relevant tie with the newest first", () => {
    const a = review("a", "2026-11-01T00:00:00Z");
    const b = review("b", "2026-11-02T00:00:00Z");

    const ids = orderReviews([a, b], "relevant").map((r) => r.id);

    expect(ids).toEqual(["b", "a"]);
  });

  it("counts a review with only a video for With photos & videos", () => {
    const video = review("video", "2026-11-21T00:00:00Z", { video_url: "https://example.test/v.mp4" });

    const ids = orderReviews([...all, video], "media").map((r) => r.id);

    expect(ids).toEqual(["video", "middle"]);
  });

  it("keeps only reviews with photos, newest first, for With photos & videos", () => {
    const ids = orderReviews(all, "media").map((r) => r.id);

    expect(ids).toEqual(["middle"]);
  });

  it("shows every review newest first for Newest", () => {
    const ids = orderReviews(all, "newest").map((r) => r.id);

    expect(ids).toEqual(["fresh", "middle", "old"]);
  });

  it("leaves the list it was given in its original order", () => {
    orderReviews(all, "newest");

    expect(all.map((r) => r.id)).toEqual(["middle", "fresh", "old"]);
  });

  describe("the logged-in traveler's own review", () => {
    it("comes first for Most relevant, even with no Helpful marks", () => {
      const ids = orderReviews(all, "relevant", "user-middle").map((r) => r.id);

      expect(ids).toEqual(["middle", "old", "fresh"]);
    });

    it("comes first for Newest, even when it is the oldest", () => {
      const ids = orderReviews(all, "newest", "user-old").map((r) => r.id);

      expect(ids).toEqual(["old", "fresh", "middle"]);
    });

    it("comes first for With photos & videos when it has a photo", () => {
      const newer = review("newer", "2026-11-21T00:00:00Z", { photos: [photo] });

      const ids = orderReviews([...all, newer], "media", "user-middle").map((r) => r.id);

      expect(ids).toEqual(["middle", "newer"]);
    });

    it("is left out of With photos & videos when it has no photo or video", () => {
      const ids = orderReviews(all, "media", "user-fresh").map((r) => r.id);

      expect(ids).toEqual(["middle"]);
    });

    it("changes nothing for a traveler with no review here, or a logged-out visitor", () => {
      const expected = ["old", "fresh", "middle"];

      expect(orderReviews(all, "relevant", "user-nobody").map((r) => r.id)).toEqual(expected);
      expect(orderReviews(all, "relevant").map((r) => r.id)).toEqual(expected);
    });
  });
});

describe("showMore", () => {
  it("adds five more each time, never past the total", () => {
    expect(showMore(FIRST_SHOWN, 20)).toBe(FIRST_SHOWN + MORE_STEP);
    expect(showMore(8, 10)).toBe(10);
  });
});
