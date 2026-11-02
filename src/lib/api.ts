import axios from "axios";

// Calls to the NestJS backend (backend/), made with axios. Every page and
// component gets its data through these functions, so the backend address
// lives in one place.
//
// NEXT_PUBLIC_API_URL is the backend's address, e.g. http://localhost:5000.
// It is safe in the browser: it is a web address, not a secret.

export interface Destination {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  photo_url: string;
  description: string;
  category: string;
  location_type: string;
}

export interface Accommodation {
  id: string;
  name: string;
  address: string;
  phone: string | null;
  email: string | null;
  latitude: number;
  longitude: number;
  photo_url: string;
  description: string;
  type: string;
  location_type: string;
}

// One axios client for the whole app, created on first use. Every request
// starts from baseURL, so pages only pass paths like "/v1/destinations".
let client: ReturnType<typeof axios.create> | null = null;

const api = () => {
  if (!client) {
    const baseURL = process.env.NEXT_PUBLIC_API_URL;
    if (!baseURL) {
      throw new Error(
        "NEXT_PUBLIC_API_URL is not set. Add it to .env.local (see .env.example).",
      );
    }
    client = axios.create({ baseURL, timeout: 10_000 });
  }
  return client;
};

// GET a path from the backend. Returns null for 404 (not found) so pages
// can show their own message; other errors throw.
const get = async <T>(path: string): Promise<T | null> => {
  try {
    const { data } = await api().get<T>(path);
    return data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return null;
    }
    throw error;
  }
};

// The home page loads everything once and filters by location itself, so
// these ask for the full lists. (The backend also accepts ?category=,
// ?location_type= and ?type= filters if a page ever needs them.)
export const getDestinations = async () =>
  (await get<Destination[]>("/v1/destinations")) ?? [];

export const getDestination = (id: string) =>
  get<Destination>(`/v1/destinations/${encodeURIComponent(id)}`);

export const getAccommodations = async () =>
  (await get<Accommodation[]>("/v1/accommodations")) ?? [];

// One place's rating, for the home page cards (buttons & cards round).
export interface PlaceRating {
  place_type: "destination" | "accommodation";
  place_id: string;
  average_rating: number;
  review_count: number;
}

// Every reviewed place's average stars and number of reviews
// (GET /v1/ratings, anyone). Places with no reviews are not in the list.
export const getRatings = async () => (await get<PlaceRating[]>("/v1/ratings")) ?? [];

export const getAccommodation = (id: string) =>
  get<Accommodation>(`/v1/accommodations/${encodeURIComponent(id)}`);

// A review as the backend sends it (backend round). Only the display name
// is included, never the reviewer's email.
export interface Review {
  id: string;
  user_id: string;
  reviewer_name: string;
  // "local", "domestic" or "foreign"; null for accounts made before the
  // login extras round, which show no tag.
  traveler_type: string | null;
  rating: number;
  comment: string;
  created_at: string;
  // How many travelers marked it "Helpful", and whether the traveler
  // asking did (profiles & likes round). Missing from a review the
  // backend has just saved, which nobody has marked yet.
  helpful_count?: number;
  liked_by_me?: boolean;
  // The public address of the review's photo, or null when it has none
  // (review extras round, ticket 81).
  photo_url?: string | null;
  // The replies under it, oldest first (review extras round). Missing from
  // a review the backend has just saved, which has none yet.
  replies?: Reply[];
}

// A reply under a review (review extras round, ticket 79). The name and
// traveler type are copied from the replier's account by the database.
export interface Reply {
  id: string;
  review_id: string;
  user_id: string;
  replier_name: string;
  traveler_type: string | null;
  comment: string;
  created_at: string;
}

// Adds the logged-in traveler's reply under a review (POST
// /v1/reviews/:id/replies) and answers with the saved reply. Refusals
// carry a plain message, for example "Please write 1 to 300 characters."
export const createReply = async (accessToken: string, reviewId: string, comment: string) => {
  const { data } = await api().post<Reply>(
    `/v1/reviews/${encodeURIComponent(reviewId)}/replies`,
    { comment },
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  return data;
};

// The reasons a traveler can give when reporting a review (the same list
// as the backend and supabase/sql/026).
export type ReportReason = "spam" | "offensive" | "not_about_place" | "other";

// Reports someone else's review to the team (POST /v1/reviews/:id/report),
// as the logged-in traveler. Answers { message: "Thanks — the team will take
// a look." }. Refusals carry a plain message, for example "You've already
// reported this review." (409).
export const reportReview = async (
  accessToken: string,
  reviewId: string,
  reason: ReportReason,
  note: string,
) => {
  const { data } = await api().post<{ message: string }>(
    `/v1/reviews/${encodeURIComponent(reviewId)}/report`,
    { reason, note },
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  return data;
};

// Deletes the traveler's own reply (DELETE /v1/replies/:id). Answers with
// the backend's message, "Your reply has been deleted."
export const deleteReply = async (accessToken: string, replyId: string) => {
  const { data } = await api().delete<{ id: string; message: string }>(
    `/v1/replies/${encodeURIComponent(replyId)}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  return data;
};

// A place's reviews, newest first. Anyone may read them, so a login is
// optional: with one, the backend also says which reviews this traveler
// marked "Helpful". Errors throw, so the reviews section can say it
// couldn't load them.
export const getReviews = async (
  placeType: "destination" | "accommodation",
  placeId: string,
  accessToken?: string | null,
) => {
  const { data } = await api().get<Review[]>("/v1/reviews", {
    params: { place_type: placeType, place_id: placeId },
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
  });
  return data;
};

// One review on a traveler's profile (profiles & likes round): the review,
// the place it is about, and its "Helpful" count.
export interface ProfileReview {
  id: string;
  rating: number;
  comment: string;
  created_at: string;
  place_type: "destination" | "accommodation";
  place_id: string;
  // null only if the place was removed after the review was written.
  place_name: string | null;
  helpful_count: number;
}

// A traveler's public profile (GET /v1/travelers/:id, anyone). Built from
// their reviews, so it never holds an email.
export interface TravelerProfile {
  id: string;
  display_name: string;
  traveler_type: string | null;
  review_count: number;
  reviews: ProfileReview[];
}

// A traveler's profile, or null when there is no such traveler, or they
// have written no reviews (the backend answers 404 for both).
export const getTraveler = (id: string) =>
  get<TravelerProfile>(`/v1/travelers/${encodeURIComponent(id)}`);

// What the backend answers after marking or unmarking a review.
export interface LikeState {
  helpful_count: number;
  liked: boolean;
}

// Marks someone else's review "Helpful" (POST /v1/reviews/:id/like), or
// removes the traveler's own mark (DELETE), as the logged-in traveler.
// Answers the new count. Refusals carry a plain message, for example
// "You can't mark your own review as helpful."
export const setHelpful = async (accessToken: string, reviewId: string, helpful: boolean) => {
  const path = `/v1/reviews/${encodeURIComponent(reviewId)}/like`;
  const headers = { Authorization: `Bearer ${accessToken}` };
  const { data } = helpful
    ? await api().post<LikeState>(path, null, { headers })
    : await api().delete<LikeState>(path, { headers });
  return data;
};

// Adds the logged-in traveler's review through the backend (POST
// /v1/reviews). `accessToken` is their Supabase login token: the backend
// passes it on, so Row Level Security checks who is writing. Answers with
// the saved review.
//
// With a photo (review extras round, ticket 81) the review is sent as form
// fields plus the file ("multipart/form-data"), which is how a browser
// sends files; without one it is sent as JSON, as before.
export const createReview = async (
  accessToken: string,
  review: {
    place_type: "destination" | "accommodation";
    place_id: string;
    rating: number;
    comment: string;
  },
  photo?: File | null,
) => {
  let body: typeof review | FormData = review;
  if (photo) {
    const form = new FormData();
    form.append("place_type", review.place_type);
    form.append("place_id", review.place_id);
    form.append("rating", String(review.rating));
    form.append("comment", review.comment);
    form.append("photo", photo);
    body = form;
  }
  const { data } = await api().post<Review>("/v1/reviews", body, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return data;
};

// Changes the stars and comment of the traveler's own review through the
// backend (PATCH /v1/reviews/:id). Answers with the saved review.
//
// The photo (ticket 82): `photo` replaces the old one (sent as form data,
// like a new review); `removePhoto` removes it; with neither, the photo
// stays as it is.
export const updateReview = async (
  accessToken: string,
  id: string,
  changes: { rating: number; comment: string },
  photoChange: { photo?: File | null; removePhoto?: boolean } = {},
) => {
  let body: Record<string, unknown> | FormData = {
    ...changes,
    remove_photo: !!photoChange.removePhoto,
  };
  if (photoChange.photo) {
    const form = new FormData();
    form.append("rating", String(changes.rating));
    form.append("comment", changes.comment);
    form.append("photo", photoChange.photo);
    body = form;
  }
  const { data } = await api().patch<Review>(`/v1/reviews/${encodeURIComponent(id)}`, body, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return data;
};

// What the backend answers after deleting a review.
export interface DeletedReview {
  id: string;
  message: string;
}

// Deletes the traveler's own review through the backend
// (DELETE /v1/reviews/:id). Answers with the backend's message, for
// example "Your review has been deleted."
export const deleteReview = async (accessToken: string, id: string) => {
  const { data } = await api().delete<DeletedReview>(
    `/v1/reviews/${encodeURIComponent(id)}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  return data;
};

// The logged-in traveler, as the backend's "who is logged in" endpoint
// answers. Only their own account, never anyone else's.
export interface Traveler {
  id: string;
  email: string | null;
  display_name: string;
  // "local", "domestic" or "foreign"; null for older accounts.
  traveler_type: string | null;
}

// "Who is logged in" (GET /v1/auth/me), worked out by the backend from
// the traveler's login token.
export const getMe = async (accessToken: string) =>
  (
    await api().get<Traveler>("/v1/auth/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
  ).data;

// The login the backend hands back after logging in. The website keeps
// it in its own copy (saveLogin in src/lib/auth.ts) and sends the access
// token to the backend; expires_at says when it runs out.
export interface BackendLogin {
  session: { access_token: string; refresh_token: string; expires_at?: number } | null;
}

// What the backend answers after creating an account. Creating an account
// does not log anyone in. `needs_confirmation` is true when Supabase
// wants the email confirmed first.
export interface BackendSignUp {
  created: true;
  needs_confirmation: boolean;
}

// Creates an account through the backend (POST /v1/auth/signup).
export const signUpThroughBackend = async (account: {
  email: string;
  password: string;
  display_name: string;
  traveler_type: string;
}) => (await api().post<BackendSignUp>("/v1/auth/signup", account)).data;

// Renews the login before it runs out (POST /v1/auth/refresh). Takes the
// login's renewal code and answers with a renewed login; 401 when the
// code no longer works.
export const refreshLogin = async (refreshToken: string) =>
  (await api().post<BackendLogin>("/v1/auth/refresh", { refresh_token: refreshToken })).data;

// Ends the login on this device through the backend (POST
// /v1/auth/logout). Answers { message: "You're logged out." }.
export const logOutThroughBackend = async (accessToken: string) =>
  (
    await api().post<{ message: string }>("/v1/auth/logout", undefined, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
  ).data;

// Logs in through the backend (POST /v1/auth/login).
export const logInThroughBackend = async (email: string, password: string) =>
  (await api().post<BackendLogin>("/v1/auth/login", { email, password })).data;

// Why the backend refused, as Supabase's own code (for example
// "invalid_credentials"), and the HTTP status (429 = too many tries).
export const backendRefusal = (error: unknown) => {
  if (!axios.isAxiosError(error) || !error.response) return null;
  const code = (error.response.data as { code?: unknown } | undefined)?.code;
  return { status: error.response.status, code: typeof code === "string" ? code : null };
};

// The backend's own message when it refuses a request (for example
// "You've already reviewed this place."), or null if there is none.
export const backendMessage = (error: unknown): string | null => {
  if (!axios.isAxiosError(error)) return null;
  const message = (error.response?.data as { message?: unknown } | undefined)?.message;
  return typeof message === "string" ? message : null;
};

