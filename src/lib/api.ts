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
// can show their own message; other errors throw. `alsoNotFound` lists
// more statuses that mean "no such thing" for that call.
const get = async <T>(path: string, alsoNotFound: number[] = []): Promise<T | null> => {
  try {
    const { data } = await api().get<T>(path);
    return data;
  } catch (error) {
    const status = axios.isAxiosError(error) ? error.response?.status : undefined;
    if (status === 404 || (status !== undefined && alsoNotFound.includes(status))) {
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
  // 400: the id in the address is not a real id (e.g. /destinations/abc), so
  // there is no such place (evaluation B1, 2026-11-04).
  get<Destination>(`/v1/destinations/${encodeURIComponent(id)}`, [400]);

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
  // 400: the id in the address is not a real id (e.g. /accommodations/abc), so
  // there is no such place (evaluation B1, 2026-11-04).
  get<Accommodation>(`/v1/accommodations/${encodeURIComponent(id)}`, [400]);

// One of a review's photos (ticket 113): its public address and its
// place, 1 to 4.
export interface ReviewPhoto {
  id: string;
  url: string;
  position: number;
}

// The most photos a review can have (the database checks it too, 044).
export const MAX_REVIEW_PHOTOS = 4;

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
  // Its photos, up to 4, in order (ticket 113; one photo before that).
  // Missing from older answers, which means none.
  photos?: ReviewPhoto[];
  // The replies under it, oldest first (review extras round). Missing from
  // a review the backend has just saved, which has none yet.
  replies?: Reply[];
  // True only for the logged-in traveler's own review that the team hid
  // (ticket 109); nobody else ever gets a hidden review. It does not count
  // toward the place's rating.
  hidden?: boolean;
}

// A reply under a review (review extras round, ticket 79). The name and
// traveler type are copied from the replier's account by the database.
export interface Reply {
  id: string;
  review_id: string;
  // The reply this one answers, or null when it answers the review
  // (threaded replies round, ticket 85).
  parent_reply_id: string | null;
  user_id: string;
  replier_name: string;
  traveler_type: string | null;
  comment: string;
  created_at: string;
  // When its writer last edited the text, or null if never (ticket 95).
  updated_at: string | null;
  // How many travelers found it helpful, and whether the traveler asking
  // did (ticket 96). Missing on a reply just posted (it has none yet).
  helpful_count?: number;
  liked_by_me?: boolean;
  // True when its writer deleted it but answers are still under it
  // (thread care round, ticket 100): the page shows "This reply was
  // deleted", and the name, tag, text and writer are empty.
  deleted?: boolean;
}

// Adds the logged-in traveler's reply under a review (POST
// /v1/reviews/:id/replies) and answers with the saved reply. With
// parentReplyId it answers that reply instead of the review (ticket 85).
// Refusals carry a plain message, for example "Please write 1 to 300
// characters." or "That reply isn't under this review."
export const createReply = async (
  accessToken: string,
  reviewId: string,
  comment: string,
  parentReplyId: string | null = null,
) => {
  const { data } = await api().post<Reply>(
    `/v1/reviews/${encodeURIComponent(reviewId)}/replies`,
    parentReplyId ? { comment, parent_reply_id: parentReplyId } : { comment },
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  return data;
};

// The reasons a traveler can give when reporting a review (the same list
// as the backend and supabase/sql/026).
export type ReportReason = "spam" | "offensive" | "not_about_place" | "other";

// How each reason reads on screen: in the Report pop-up and on the team's
// Reports screen (ticket 108).
export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  spam: "Spam",
  offensive: "Offensive",
  not_about_place: "Not about this place",
  other: "Other",
};

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

// Changes the text of the traveler's own reply (PATCH /v1/replies/:id,
// ticket 95) and answers with the saved reply, including updated_at.
export const updateReply = async (accessToken: string, replyId: string, comment: string) => {
  const { data } = await api().patch<Reply>(
    `/v1/replies/${encodeURIComponent(replyId)}`,
    { comment },
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  return data;
};

// Deletes the traveler's own reply (DELETE /v1/replies/:id). Answers with
// the backend's message, "Your reply has been deleted." A reply with
// answers stays as "This reply was deleted" (ticket 100).
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
  // Its photos, up to 4, in order (ticket 99; a list since ticket 113).
  photos: ReviewPhoto[];
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
// The same for a reply (POST/DELETE /v1/replies/:id/like, ticket 96) with
// kind "reply". Answers the new count. Refusals carry a plain message, for
// example "You can't mark your own review as helpful."
export const setHelpful = async (
  accessToken: string,
  id: string,
  helpful: boolean,
  kind: "review" | "reply" = "review",
) => {
  const path = `/v1/${kind === "reply" ? "replies" : "reviews"}/${encodeURIComponent(id)}/like`;
  const headers = { Authorization: `Bearer ${accessToken}` };
  const { data } = helpful
    ? await api().post<LikeState>(path, null, { headers })
    : await api().delete<LikeState>(path, { headers });
  return data;
};

// Adds the logged-in traveler's review through the backend (POST
// /v1/reviews). `accessToken` is their Supabase login token: the backend
// passes it on, so Row Level Security checks who is writing. Answers with
// the saved review (no photos yet: they are sent one by one afterwards
// with addReviewPhoto, ticket 113).
export const createReview = async (
  accessToken: string,
  review: {
    place_type: "destination" | "accommodation";
    place_id: string;
    rating: number;
    comment: string;
  },
) => {
  const { data } = await api().post<Review>("/v1/reviews", review, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return data;
};

// Changes the stars and comment of the traveler's own review through the
// backend (PATCH /v1/reviews/:id). Answers with the saved review and its
// photos.
export const updateReview = async (
  accessToken: string,
  id: string,
  changes: { rating: number; comment: string },
) => {
  const { data } = await api().patch<Review>(`/v1/reviews/${encodeURIComponent(id)}`, changes, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return data;
};

// Adds one photo to the traveler's own review (POST /v1/reviews/:id/photos,
// ticket 113). One photo per request: four 2 MB photos together would go
// over the hosting's 4.5 MB request limit. Sent as form data, which is how
// a browser sends a file. Refusals carry a plain message, for example "A
// review can have up to 4 photos."
export const addReviewPhoto = async (accessToken: string, reviewId: string, photo: File) => {
  const form = new FormData();
  form.append("photo", photo);
  const { data } = await api().post<ReviewPhoto>(
    `/v1/reviews/${encodeURIComponent(reviewId)}/photos`,
    form,
    // A photo can take longer than other requests on a slow connection.
    { headers: { Authorization: `Bearer ${accessToken}` }, timeout: 60_000 },
  );
  return data;
};

// Removes one photo from the traveler's own review (DELETE
// /v1/reviews/:id/photos/:photoId, ticket 113).
export const deleteReviewPhoto = async (accessToken: string, reviewId: string, photoId: string) => {
  await api().delete(
    `/v1/reviews/${encodeURIComponent(reviewId)}/photos/${encodeURIComponent(photoId)}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
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
  // True for the Lakat Iloilo team (the admins table, ticket 107). Missing
  // when the answer did not come from the backend.
  is_admin?: boolean;
}

// "Who is logged in" (GET /v1/auth/me), worked out by the backend from
// the traveler's login token.
export const getMe = async (accessToken: string) =>
  (
    await api().get<Traveler>("/v1/auth/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
  ).data;

// Changes the logged-in traveler's own display name and traveler type
// (PATCH /v1/auth/me, ticket 94) and answers like getMe. The database
// copies them onto all their reviews and replies.
export const updateMe = async (
  accessToken: string,
  details: { display_name: string; traveler_type: string },
) =>
  (
    await api().patch<Traveler>("/v1/auth/me", details, {
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

// The Lakat Iloilo team's own sign-in (POST /v1/admin/login, ticket
// 107). Answers like logInThroughBackend for an admin; anyone else is
// refused with 403 and is not logged in.
export const adminLogInThroughBackend = async (email: string, password: string) =>
  (await api().post<BackendLogin>("/v1/admin/login", { email, password })).data;

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


// One notification for the logged-in traveler (thread care round, ticket
// 102): someone replied to their review ("review_reply"), answered their
// reply ("reply_answer"), or marked either Helpful (ticket 106), on this
// place.
export interface TravelerNotification {
  id: string;
  // Since ticket 106 also "review_like" / "reply_like": someone marked
  // their review / reply Helpful.
  kind: "review_reply" | "reply_answer" | "review_like" | "reply_like";
  actor_name: string;
  place_type: "destination" | "accommodation";
  place_id: string;
  place_name: string;
  // The review the conversation is under: the bell opens the place page
  // at this review (ticket 103).
  review_id: string;
  // The reply it is about (the new reply, or the liked one), or null for a
  // Helpful mark on the review itself: the bell opens the page at it.
  reply_id: string | null;
  read: boolean;
  created_at: string;
}

// The logged-in traveler's own 20 newest notifications, newest first, and
// how many are unread (GET /v1/notifications).
export const getNotifications = async (accessToken: string) =>
  (
    await api().get<{ notifications: TravelerNotification[]; unread_count: number }>(
      "/v1/notifications",
      { headers: { Authorization: `Bearer ${accessToken}` } },
    )
  ).data;

// Marks one of the logged-in traveler's notifications read, or all of them
// without an id (POST /v1/notifications/read, ticket 103). Answers how many
// are still unread.
export const markNotificationsRead = async (accessToken: string, id?: string) =>
  (
    await api().post<{ unread_count: number }>(
      "/v1/notifications/read",
      id ? { id } : {},
      { headers: { Authorization: `Bearer ${accessToken}` } },
    )
  ).data;

// One report on a review, on the team's Reports screen (ticket 108). It
// never says who sent it: the database does not let admins read that.
export interface AdminReport {
  id: string;
  reason: ReportReason;
  note: string | null;
  created_at: string;
}

// A reported review with all its reports (GET /v1/admin/reports).
export interface ReportedReview {
  id: string;
  place_type: "destination" | "accommodation";
  place_id: string;
  place_name: string;
  reviewer_id: string;
  reviewer_name: string;
  rating: number;
  comment: string;
  // Up to 4 photos, in order (ticket 113).
  photos: ReviewPhoto[];
  // Hidden by the team (ticket 109), or by three reports (ticket 110).
  hidden: boolean;
  created_at: string;
  report_count: number;
  reports: AdminReport[];
}

// Every reported review, most reports first (GET /v1/admin/reports,
// admins only: anyone else gets 403).
export const getAdminReports = async (accessToken: string) =>
  (
    await api().get<ReportedReview[]>("/v1/admin/reports", {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
  ).data;

// What the backend answers after Keep it, Hide it or Delete review.
export interface ModerationResult {
  id: string;
  message: string;
}

// The team's three answers to a reported review (ticket 109), admins only:
// Keep it removes its reports and shows it again; Hide it hides it from
// everyone but its writer and the team; Delete review deletes it with its
// replies, likes, reports, notifications and photo.
export const adminKeepReview = async (accessToken: string, id: string) =>
  (
    await api().post<ModerationResult>(`/v1/admin/reviews/${id}/keep`, null, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
  ).data;

export const adminHideReview = async (accessToken: string, id: string) =>
  (
    await api().post<ModerationResult>(`/v1/admin/reviews/${id}/hide`, null, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
  ).data;

export const adminDeleteReview = async (accessToken: string, id: string) =>
  (
    await api().delete<ModerationResult>(`/v1/admin/reviews/${id}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
  ).data;

// One of the newest reports on the dashboard home (ticket 111). Never who
// sent it.
export interface NewestReport {
  id: string;
  review_id: string;
  reason: ReportReason;
  note: string | null;
  created_at: string;
  place_name: string;
  reviewer_name: string;
}

// The dashboard home's numbers (GET /v1/admin/overview, admins only).
export interface AdminOverviewData {
  reviews_this_week: number;
  reports_waiting: number;
  reported_reviews: number;
  hidden_reviews: number;
  places: number;
  newest_reports: NewestReport[];
}

export const getAdminOverview = async (accessToken: string) =>
  (
    await api().get<AdminOverviewData>("/v1/admin/overview", {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
  ).data;

// The team's Places screen (ticket 112, admins only).
export type AdminPlaceType = "destination" | "accommodation";

// One row of the Places list.
export interface AdminPlaceRow {
  id: string;
  type: AdminPlaceType;
  name: string;
  // A destination's category or an accommodation's kind.
  kind: string;
  address: string;
  location_type: string;
}

// One place as the Edit form needs it. phone and email are null for
// destinations.
export interface AdminPlaceDetails {
  id: string;
  type: AdminPlaceType;
  name: string;
  description: string;
  address: string;
  phone: string | null;
  email: string | null;
  kind: string;
  photo_url: string | null;
  updated_at: string;
}

// What the Edit form saves. Empty phone or email means none.
export interface AdminPlaceChanges {
  name: string;
  description: string;
  address: string;
  phone?: string;
  email?: string;
}

// The same limits as the backend and the database (supabase/sql/043).
export const PLACE_LIMITS = { name: 100, address: 200, description: 1000, phone: 40, email: 120 };

export const getAdminPlaces = async (accessToken: string) =>
  (
    await api().get<AdminPlaceRow[]>("/v1/admin/places", {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
  ).data;

// One place for the Edit form; null when there is no such place.
export const getAdminPlace = async (accessToken: string, type: string, id: string) => {
  try {
    return (
      await api().get<AdminPlaceDetails>(
        `/v1/admin/places/${encodeURIComponent(type)}/${encodeURIComponent(id)}`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      )
    ).data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) return null;
    throw error;
  }
};

export const updateAdminPlace = async (
  accessToken: string,
  type: AdminPlaceType,
  id: string,
  changes: AdminPlaceChanges,
) =>
  (
    await api().patch<AdminPlaceDetails>(`/v1/admin/places/${type}/${id}`, changes, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
  ).data;
