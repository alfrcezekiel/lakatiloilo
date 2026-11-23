import axios from "axios";
import { backendPassHeaders } from "./backend-headers";

// Calls to the NestJS backend (backend/), made with axios. Every page and
// component gets its data through these functions, so the backend address
// lives in one place.
//
// Where the calls go (security hardening round, tickets 151–153):
//   - in the browser: /api/v1/... on our own website. The proxy route
//     (src/app/api/[...path]/route.ts) passes them on to the backend, so
//     the backend's address never reaches a visitor;
//   - on the server (server components): straight to the backend at
//     API_URL. Going through /api there would mean our server calling
//     itself over the internet, which is slower and fails during the build.
// API_URL has no NEXT_PUBLIC_ prefix on purpose: Next.js copies every
// NEXT_PUBLIC_ variable into the JavaScript each visitor downloads.

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
  // On GET /v1/destinations/:id only (ticket 135).
  photo_credit?: PublicPhotoCredit | null;
  // Its other allowed photos, in order (ticket 146); one place only.
  photos?: PublicPlacePhoto[];
}

// One of a place's other photos travelers may see (ticket 146).
export interface PublicPlacePhoto extends PublicPhotoCredit {
  id: string;
  url: string;
}

// The credit line under a place's photo (photo credits round, ticket 135).
// source_url is empty for none.
export interface PublicPhotoCredit {
  credit_line: string;
  licence: string;
  source_url: string;
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
  // On GET /v1/accommodations/:id only (ticket 135).
  photo_credit?: PublicPhotoCredit | null;
  // Its other allowed photos, in order (ticket 146); one place only.
  photos?: PublicPlacePhoto[];
}

// One axios client for the whole app, created on first use. Every request
// starts from baseURL, so pages only pass paths like "/v1/destinations".
let client: ReturnType<typeof axios.create> | null = null;

// The start of every backend address; the only place that reads API_URL.
const backendBase = () => {
  if (typeof window !== "undefined") return "/api";
  const backend = process.env.API_URL;
  if (!backend) throw new Error("API_URL is not set. Add it to .env.local (see .env.example).");
  return backend.replace(/\/+$/, "");
};

const api = () => {
  if (!client) client = axios.create({ baseURL: backendBase(), timeout: 10_000, headers: backendPassHeaders() });
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
  // Its video's address, or null (ticket 165). Missing from older answers,
  // which means none.
  video_url?: string | null;
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
  // Hidden by the Lakat Iloilo team (admin extras round, ticket 140): its
  // text is empty for everyone but its writer, who gets their own text.
  hidden?: boolean;
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

// Attaches a video the browser uploaded into the traveler's own folder to
// their review (POST /v1/reviews/:id/video, ticket 165) and answers its
// address. Refusals carry a plain message, for example "Please choose an
// MP4, MOV or WebM video up to 50 MB and 60 seconds."
export const attachReviewVideo = async (accessToken: string, reviewId: string, path: string) => {
  const { data } = await api().post<{ video_url: string }>(
    `/v1/reviews/${encodeURIComponent(reviewId)}/video`,
    { path },
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  return data.video_url;
};

// Removes the video from the traveler's own review (DELETE
// /v1/reviews/:id/video, ticket 165).
export const removeReviewVideo = async (accessToken: string, reviewId: string) => {
  await api().delete(`/v1/reviews/${encodeURIComponent(reviewId)}/video`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
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
  // Its video's address, or null (ticket 166).
  video_url: string | null;
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

// One review on the Reviews screen (ticket 122): hidden ones too.
export interface AdminReview {
  id: string;
  place_type: "destination" | "accommodation";
  place_id: string;
  place_name: string;
  reviewer_id: string;
  reviewer_name: string;
  rating: number;
  comment: string;
  photos: ReviewPhoto[];
  // Its video's address, or null (ticket 166).
  video_url: string | null;
  hidden: boolean;
  created_at: string;
  helpful_count: number;
  report_count: number;
  reply_count: number;
}

export type AdminReviewFilter = "all" | "hidden" | "reported";

// One page of 50: `next` goes back as `before` for "Show more" (null when
// there is no more); `total` is how many match in all.
export interface AdminReviewPage {
  reviews: AdminReview[];
  total: number;
  page: number;
  per_page: number;
}

export type AdminReviewSort = "recent" | "relevant" | "top";

// One numbered page of reviews (GET /v1/admin/reviews, admins only; pages
// and sorting since ticket 130). `q` searches the review text, the
// reviewer's name and the place's name.
export const getAdminReviews = async (
  accessToken: string,
  {
    q,
    show,
    sort,
    perPage,
    page,
  }: { q: string; show: AdminReviewFilter; sort: AdminReviewSort; perPage: number; page: number },
) =>
  (
    await api().get<AdminReviewPage>("/v1/admin/reviews", {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: { ...(q ? { q } : {}), show, sort, per_page: perPage, page },
    })
  ).data;

// One reply under a review on the Reviews screen (ticket 124), oldest
// first. A deleted one ("This reply was deleted") has no writer, name or
// text; it stays because it holds answers.
export interface AdminReply {
  id: string;
  parent_reply_id: string | null;
  replier_id: string | null;
  replier_name: string;
  comment: string;
  created_at: string;
  updated_at: string | null;
  deleted: boolean;
  // Hidden by the team (ticket 140); comment is still its text here.
  hidden: boolean;
  helpful_count: number;
}

// What every item in the dashboard's Trash has (admin extras round,
// tickets 147 and 148).
interface TrashedBase {
  id: string;
  trashed_at: string;
  trashed_by_name: string;
  // When it is deleted for good (30 days after it went to the Trash).
  expires_at: string;
}

// One review in the Trash (ticket 147).
export interface TrashedReview extends TrashedBase {
  kind: "review";
  place_type: AdminPlaceType;
  place_id: string;
  place_name: string;
  reviewer_name: string;
  rating: number;
  comment: string;
  reply_count: number;
  photo_count: number;
  report_count: number;
  // Its place is in the Trash too: restore the place first.
  place_in_trash: boolean;
}

// One reply in the Trash (ticket 148).
export interface TrashedReply extends TrashedBase {
  kind: "reply";
  review_id: string;
  place_type: AdminPlaceType;
  place_id: string;
  place_name: string;
  reviewer_name: string;
  replier_name: string;
  comment: string;
  answer_count: number;
  like_count: number;
  // Its review is in the Trash too: restore the review first.
  review_in_trash: boolean;
}

// One place in the Trash (ticket 148), with the reviews that went with it.
export interface TrashedPlace extends TrashedBase {
  kind: "place";
  place_type: AdminPlaceType;
  name: string;
  photo_url: string | null;
  review_count: number;
  photo_count: number;
}

export type TrashedItem = TrashedReview | TrashedReply | TrashedPlace;

export const getAdminTrash = async (accessToken: string) =>
  (
    await api().get<TrashedItem[]>("/v1/admin/trash", {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
  ).data;

// Restore (tickets 147 and 148): the item comes back as it was.
export const restoreAdminTrashItem = async (accessToken: string, item: TrashedItem) =>
  (
    await api().post<{ id: string; message: string }>(
      item.kind === "place"
        ? `/v1/admin/trash/places/${item.place_type}/${item.id}/restore`
        : `/v1/admin/trash/${item.kind === "review" ? "reviews" : "replies"}/${item.id}/restore`,
      {},
      { headers: { Authorization: `Bearer ${accessToken}` } },
    )
  ).data;

// Delete for good (ticket 149): only for an item in the Trash, with its
// photo files.
export const deleteAdminTrashItemForGood = async (accessToken: string, item: TrashedItem) =>
  (
    await api().delete<{ id: string; message: string }>(
      item.kind === "place"
        ? `/v1/admin/trash/places/${item.place_type}/${item.id}`
        : `/v1/admin/trash/${item.kind === "review" ? "reviews" : "replies"}/${item.id}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    )
  ).data;

// Show it on a hidden reply (ticket 140); straight away, no Undo needed.
export const adminShowReply = async (accessToken: string, replyId: string) =>
  (
    await api().post<{ id: string; hidden: boolean; message: string }>(
      `/v1/admin/replies/${replyId}/show`,
      {},
      { headers: { Authorization: `Bearer ${accessToken}` } },
    )
  ).data;

export const getAdminReplies = async (accessToken: string, reviewId: string) =>
  (
    await api().get<AdminReply[]>(`/v1/admin/reviews/${reviewId}/replies`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
  ).data;

// Who marked a review or reply Helpful (ticket 125), newest first.
// Display names only, never an email.
export interface AdminLiker {
  user_id: string;
  display_name: string;
  created_at: string;
}
export type AdminLikeKind = "review" | "reply";

const likesPath = (kind: AdminLikeKind, id: string) =>
  `/v1/admin/${kind === "review" ? "reviews" : "replies"}/${id}/likes`;

export const getAdminLikers = async (accessToken: string, kind: AdminLikeKind, id: string) =>
  (
    await api().get<AdminLiker[]>(likesPath(kind, id), {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
  ).data;

// The deletes that wait 8 seconds for Undo (ticket 127). Each is one
// DELETE to the backend, described by its path, so it can also be sent
// while the tab closes (keepalive: the browser finishes it after the page
// is gone).
export const adminDeletePaths = {
  review: (id: string) => `/v1/admin/reviews/${id}`,
  reply: (id: string) => `/v1/admin/replies/${id}`,
  // Hide it on a reply (ticket 140), sent as a POST after the Undo.
  hideReply: (id: string) => `/v1/admin/replies/${id}/hide`,
  place: (type: AdminPlaceType, id: string) => `/v1/admin/places/${type}/${id}`,
  like: (kind: AdminLikeKind, id: string, userId: string) => `${likesPath(kind, id)}/${userId}`,
};

// Sends one of those deletes. Throws with the backend's own sentence when
// it refuses; a 404 (already gone) counts as done.
export const adminSendDelete = async (
  accessToken: string,
  path: string,
  keepalive = false,
  // POST for Hide it on a reply (ticket 140), which waits the same way.
  method: "DELETE" | "POST" = "DELETE",
) => {
  const response = await fetch(`${backendBase()}${path}`, {
    method,
    headers: { Authorization: `Bearer ${accessToken}`, ...backendPassHeaders() },
    keepalive,
  });
  if (response.ok || response.status === 404) return;
  const body = (await response.json().catch(() => null)) as { message?: unknown } | null;
  throw new Error(typeof body?.message === "string" ? body.message : "Something went wrong. Please try again.");
};

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

// Show it (Reviews screen, ticket 123): shows a hidden review again and
// keeps its reports.
export const adminShowReview = async (accessToken: string, id: string) =>
  (
    await api().post<ModerationResult>(`/v1/admin/reviews/${id}/show`, null, {
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
  // Storage used (ticket 167), or null when it could not be read.
  storage: StorageUsed | null;
}

// Every file in the project against the free plan's 1 GB, and the three
// buckets the app fills (ticket 167).
export interface StorageUsed {
  used_bytes: number;
  limit_bytes: number;
  place_photos_bytes: number;
  review_photos_bytes: number;
  review_videos_bytes: number;
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
  // How many reviews go with it if it is deleted (ticket 121).
  review_count: number;
  // For sorting (ticket 129): when it was added, and its average stars
  // from the reviews travelers see (null without any).
  created_at: string;
  average_rating: number | null;
  // No photo credits yet, or marked "Not checked yet" (ticket 134).
  // The place's photo, for the category card photo picker (ticket 142).
  photo_url: string | null;
  credit_missing: boolean;
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
  // "iloilo_city" or "iloilo_province".
  location_type: string;
  latitude: number;
  longitude: number;
  photo_url: string | null;
  updated_at: string;
  // The photo's credits and copyright, or null before any are saved
  // (photo credits round, ticket 132).
  credits: SavedPhotoCredits | null;
  // Every photo of the place, cover first, each with its credits (admin
  // extras round, ticket 144). Missing from an answer saved before it.
  photos?: AdminPlacePhoto[];
}

// One photo of a place on the Edit form (ticket 144): position 1 is the
// cover.
export interface AdminPlacePhoto {
  id: string;
  position: number;
  photo_url: string;
  credits: SavedPhotoCredits | null;
}

export const MAX_PLACE_PHOTOS = 6;

// Adds one more photo with its credits (POST …/photos, ticket 144), sent
// as form data like Add a place. Answers the place.
export const addAdminPlacePhoto = async (
  accessToken: string,
  type: AdminPlaceType,
  id: string,
  photo: File,
  credits: PhotoCredits,
) => {
  const form = new FormData();
  for (const [key, value] of Object.entries(credits)) form.append(key, String(value));
  form.append("photo", photo);
  return (
    await api().post<AdminPlaceDetails>(`/v1/admin/places/${type}/${id}/photos`, form, {
      headers: { Authorization: `Bearer ${accessToken}` },
      timeout: 60_000,
    })
  ).data;
};

// Moves a photo (PATCH …/photos/:photoId, ticket 145): position 1 makes it
// the cover; the others shift. Answers the place.
export const moveAdminPlacePhoto = async (
  accessToken: string,
  type: AdminPlaceType,
  id: string,
  photoId: string,
  position: number,
) =>
  (
    await api().patch<AdminPlaceDetails>(
      `/v1/admin/places/${type}/${id}/photos/${photoId}`,
      { position },
      { headers: { Authorization: `Bearer ${accessToken}` } },
    )
  ).data;

// Deletes a photo with its credits (DELETE …/photos/:photoId, ticket 145);
// the last photo of a place cannot be deleted. Answers the place.
export const deleteAdminPlacePhoto = async (accessToken: string, type: AdminPlaceType, id: string, photoId: string) =>
  (
    await api().delete<AdminPlaceDetails>(`/v1/admin/places/${type}/${id}/photos/${photoId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
  ).data;

// Saves one photo's credits (PUT …/photos/:photoId/credits, ticket 144).
export const saveAdminPlacePhotoCredits = async (
  accessToken: string,
  type: AdminPlaceType,
  id: string,
  photoId: string,
  credits: PhotoCredits,
) =>
  (
    await api().put<AdminPlaceDetails>(`/v1/admin/places/${type}/${id}/photos/${photoId}/credits`, credits, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
  ).data;

// A place photo's credits and copyright (ticket 132, supabase/sql/054).
// publisher and source_url are empty for none.
export type Licence = "cc_by_4" | "cc_by_sa_4" | "cc0" | "all_rights_reserved" | "own_photo" | "other";
export type AuthorizationStatus = "licence_allows" | "owner_permission" | "own_photo" | "not_checked";
export interface PhotoCredits {
  photographer: string;
  publisher: string;
  source_url: string;
  licence: Licence;
  authorization_status: AuthorizationStatus;
  credit_line: string;
}
export interface SavedPhotoCredits extends PhotoCredits {
  // The photo was replaced after these were saved: they need a check.
  photo_changed: boolean;
  updated_at: string;
}
export const CREDIT_LIMITS = { photographer: 100, publisher: 100, source_url: 500, credit_line: 200 };

// Adds or changes a place photo's credits; answers the saved place.
export const saveAdminPlaceCredits = async (
  accessToken: string,
  type: AdminPlaceType,
  id: string,
  credits: PhotoCredits,
) =>
  (
    await api().put<AdminPlaceDetails>(`/v1/admin/places/${type}/${id}/credits`, credits, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
  ).data;

// What the Edit form saves. Empty phone or email means none.
export interface AdminPlaceChanges {
  name: string;
  description: string;
  address: string;
  // The category (destination) or kind (accommodation), an id from the
  // categories list; the location; and the map position (ticket 118).
  kind: string;
  location_type: string;
  latitude: number;
  longitude: number;
  phone?: string;
  email?: string;
}

// Inside Iloilo: the same box as the backend and the database (048).
export const ILOILO = { latitude: [10.4, 11.7], longitude: [121.8, 123.3] } as const;

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

// A destination category or an accommodation kind (full admin management
// round, ticket 116). `id` is what a place's category or type holds.
export interface PlaceCategory {
  id: string;
  name: string;
  applies_to: AdminPlaceType;
  // Its card's icon and photo on the home page (ticket 142, supabase/sql
  // 058): null for the default (its own built-in one, or a pin / a bed and
  // its first place's photo). photo_place_id is one of its own places.
  icon?: string | null;
  photo_place_id?: string | null;
}
export type PlaceCategoryWithCount = PlaceCategory & { place_count: number };

export const CATEGORY_NAME = { min: 2, max: 30 };

// Every category and kind, A to Z (GET /v1/categories, anyone).
// One place photo credit saved on the dashboard, for the Photo credits
// page (photo credits round, ticket 136). source_url is empty for none.
export interface PhotoCreditEntry {
  // The photo it credits (a place can have several since ticket 143).
  photo_id: string;
  place_type: "destination" | "accommodation";
  place_id: string;
  place_name: string;
  credit_line: string;
  licence: string;
  source_url: string;
}

export const getPhotoCredits = async () => (await get<PhotoCreditEntry[]>("/v1/photo-credits")) ?? [];

// Edits a category or kind (admin extras round, tickets 141, 142): any of
// its name, icon and card photo (null icon or photo = the default). Its
// id, which places point at, stays.
export const updateAdminCategory = async (
  accessToken: string,
  id: string,
  changes: { name?: string; icon?: string | null; photo_place_id?: string | null },
) =>
  (
    await api().patch<PlaceCategoryWithCount>(`/v1/admin/categories/${encodeURIComponent(id)}`, changes, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
  ).data;

export const getCategories = async () => (await get<PlaceCategory[]>("/v1/categories")) ?? [];

// The name of one category or kind, for a place page: "beach" -> "Beaches".
// Falls back to the id itself if the list cannot be read.
export const categoryName = async (id: string) => {
  try {
    return (await getCategories()).find((category) => category.id === id)?.name ?? id;
  } catch {
    return id;
  }
};

// The same with how many places use each (admins only).
export const getAdminCategories = async (accessToken: string) =>
  (
    await api().get<PlaceCategoryWithCount[]>("/v1/admin/categories", {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
  ).data;

// Adds a category or kind (admins only). Refusals carry a plain message,
// for example "That name is already used."
export const addAdminCategory = async (accessToken: string, name: string, appliesTo: AdminPlaceType) =>
  (
    await api().post<PlaceCategoryWithCount>(
      "/v1/admin/categories",
      { name, applies_to: appliesTo },
      { headers: { Authorization: `Bearer ${accessToken}` } },
    )
  ).data;

// Deletes a category or kind that no place uses (admins only).
export const deleteAdminCategory = async (accessToken: string, id: string) =>
  (
    await api().delete<{ id: string; message: string }>(
      `/v1/admin/categories/${encodeURIComponent(id)}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    )
  ).data;

// Adds a new place with its photo (POST /v1/admin/places/:type, ticket
// 120), sent as form data: the same fields as the Edit form plus the
// required photo (JPG, PNG or WebP up to 2 MB). Answers with the new place.
export const createAdminPlace = async (
  accessToken: string,
  type: AdminPlaceType,
  place: AdminPlaceChanges,
  photo: File,
  // Required for a new place (ticket 133); sent as fields of the same form.
  credits: PhotoCredits,
) => {
  const form = new FormData();
  for (const [key, value] of Object.entries({ ...place, ...credits })) {
    if (value !== undefined) form.append(key, String(value));
  }
  form.append("photo", photo);
  return (
    await api().post<AdminPlaceDetails>(`/v1/admin/places/${type}`, form, {
      headers: { Authorization: `Bearer ${accessToken}` },
      timeout: 60_000,
    })
  ).data;
};

// Replaces a place's photo with a file from the admin's computer (POST
// /v1/admin/places/:type/:id/photo, ticket 119): one JPG, PNG or WebP up to
// 2 MB, sent as form data. Answers with the saved place.
export const replaceAdminPlacePhoto = async (
  accessToken: string,
  type: AdminPlaceType,
  id: string,
  photo: File,
) => {
  const form = new FormData();
  form.append("photo", photo);
  return (
    await api().post<AdminPlaceDetails>(`/v1/admin/places/${type}/${id}/photo`, form, {
      headers: { Authorization: `Bearer ${accessToken}` },
      timeout: 60_000,
    })
  ).data;
};
