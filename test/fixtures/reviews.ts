import type { Reply, Review, Traveler } from "@/lib/api";

// Sample travelers, reviews and replies for frontend tests. Made up, with
// Ilonggo names and places, so tests read like the real site. None of
// them exist in the hosted database.

export const PLACE_ID = "5d1155a1-6e40-417d-9c84-09a990cae00d";
export const ME = "11111111-1111-4111-8111-111111111111";
export const SOMEONE_ELSE = "33333333-3333-4333-8333-333333333333";

export const traveler = (overrides: Partial<Traveler> = {}): Traveler => ({
  id: ME,
  email: "juan@example.test",
  display_name: "Juan dela Cruz",
  traveler_type: "local",
  ...overrides,
});

export const review = (overrides: Partial<Review> = {}): Review => ({
  id: "aaaaaaaa-0000-4000-8000-000000000001",
  user_id: SOMEONE_ELSE,
  reviewer_name: "Maria Santos",
  traveler_type: "domestic",
  rating: 5,
  comment: "Ang ganda sa Garin Farm! Worth the climb.",
  created_at: "2026-11-10T08:00:00Z",
  helpful_count: 0,
  liked_by_me: false,
  photos: [],
  replies: [],
  ...overrides,
});

// A reply. `id` is short ("r1") so threads are easy to read in tests;
// parent = the reply it answers, or null for a reply to the review.
export const reply = (id: string, parent: string | null, minute: number, overrides: Partial<Reply> = {}): Reply => ({
  id,
  review_id: "aaaaaaaa-0000-4000-8000-000000000001",
  parent_reply_id: parent,
  user_id: SOMEONE_ELSE,
  replier_name: "Niño Peñaflor",
  traveler_type: "local",
  comment: `Reply ${id}`,
  created_at: `2026-11-10T09:${String(minute).padStart(2, "0")}:00Z`,
  updated_at: null,
  helpful_count: 0,
  liked_by_me: false,
  ...overrides,
});
