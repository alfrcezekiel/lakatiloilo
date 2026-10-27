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
}

// A place's reviews, newest first. Anyone may read them, so no login is
// sent. Errors throw, so the reviews section can say it couldn't load them.
export const getReviews = async (
  placeType: "destination" | "accommodation",
  placeId: string,
) => {
  const { data } = await api().get<Review[]>("/v1/reviews", {
    params: { place_type: placeType, place_id: placeId },
  });
  return data;
};

// Adds the logged-in traveler's review through the backend (POST
// /v1/reviews). `accessToken` is their Supabase login token: the backend
// passes it on, so Row Level Security checks who is writing. Answers with
// the saved review.
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
// backend (PATCH /v1/reviews/:id). Answers with the saved review.
export const updateReview = async (
  accessToken: string,
  id: string,
  changes: { rating: number; comment: string },
) => {
  const { data } = await api().patch<Review>(
    `/v1/reviews/${encodeURIComponent(id)}`,
    changes,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  return data;
};

// Deletes the traveler's own review through the backend
// (DELETE /v1/reviews/:id).
export const deleteReview = async (accessToken: string, id: string) => {
  await api().delete(`/v1/reviews/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
};

// The backend's own message when it refuses a request (for example
// "You've already reviewed this place."), or null if there is none.
export const backendMessage = (error: unknown): string | null => {
  if (!axios.isAxiosError(error)) return null;
  const message = (error.response?.data as { message?: unknown } | undefined)?.message;
  return typeof message === "string" ? message : null;
};

