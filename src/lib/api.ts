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
