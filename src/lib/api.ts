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

