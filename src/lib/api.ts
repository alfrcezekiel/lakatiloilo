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

// GET a path from the backend. axios turns `params` into the query string
// (?category=mountain) and skips any that are undefined. Returns null for
// 404 (not found) so pages can show their own message; other errors throw.
const get = async <T>(
  path: string,
  params: Record<string, string | undefined> = {},
): Promise<T | null> => {
  try {
    const { data } = await api().get<T>(path, { params });
    return data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return null;
    }
    throw error;
  }
};

export const getDestinations = async (
  filters: { category?: string; location_type?: string } = {},
) => (await get<Destination[]>("/v1/destinations", filters)) ?? [];

export const getDestination = (id: string) =>
  get<Destination>(`/v1/destinations/${encodeURIComponent(id)}`);

export const getAccommodations = async (filters: { type?: string } = {}) =>
  (await get<Accommodation[]>("/v1/accommodations", filters)) ?? [];

export const getAccommodation = (id: string) =>
  get<Accommodation>(`/v1/accommodations/${encodeURIComponent(id)}`);
