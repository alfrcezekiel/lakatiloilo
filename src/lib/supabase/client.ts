import { createBrowserClient } from "@supabase/ssr";
import { env } from "@/env";

/**
 * Supabase client for BROWSER code — anything in a file with "use client".
 *
 * This runs in the user's browser, so it can ONLY ever use the anon key.
 * The anon key is safe to expose: it is Row Level Security on your tables
 * that decides who can read and write what. If RLS is off, your data is
 * public to the whole internet — see supabase/sql/001-example.sql.
 */
export function createClient() {
  // Checked in src/env.ts: a missing value is an error naming it.
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  return createBrowserClient(url, anonKey);
}
