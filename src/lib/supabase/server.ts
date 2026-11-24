import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { env } from "@/env";

/**
 * Supabase client for SERVER code — server components, route handlers,
 * server actions. Reads and writes the auth cookie so logged-in users
 * stay logged in.
 *
 * Still the anon key, on purpose. Never put the service_role key in this
 * project: it bypasses Row Level Security entirely.
 */
export async function createClient() {
  // Checked in src/env.ts: a missing value is an error naming it.
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Called from a server component, where cookies are read-only.
          // Safe to ignore if you refresh sessions in middleware.
        }
      },
    },
  });
}
