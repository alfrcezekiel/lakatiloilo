"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

// Who is logged in right now, for any "use client" component.
// `user` is null when nobody is logged in. `ready` is false for a moment
// while Supabase reads the login cookie, so the page can wait instead of
// flashing "Log in" at someone who is already logged in.
export function useCurrentUser() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    // Runs once straight away with the current login, then again whenever
    // someone logs in or out (in this tab or another one).
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setReady(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  return { user, ready };
}

// The name travelers chose when they signed up. Falls back to the part of
// the email before the @, so an account without a name still shows
// something sensible.
export function displayNameOf(user: User) {
  const name = user.user_metadata?.display_name;
  if (typeof name === "string" && name.trim()) return name.trim();
  return user.email?.split("@")[0] ?? "Traveler";
}

// Where to send someone after they log in, from the ?next= part of the
// address. Only paths on this site are allowed ("/destinations/…"), so a
// crafted link cannot bounce people to another website after logging in.
export function safeNextPath(next: string | null) {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) {
    return "/";
  }
  return next;
}
