"use client";

import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
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
    let stopListening = () => {};
    let cancelled = false;

    async function start() {
      // They opened a reset link but left without saving a new password:
      // log out first, so the page never shows them logged in (that login
      // is only for the Set new password page).
      if (resetIsPending()) {
        await supabase.auth.signOut({ scope: "local" });
        endPasswordReset();
      }
      if (cancelled) return;
      // Runs once straight away with the current login, then again
      // whenever someone logs in or out (in this tab or another one).
      // A login made by a reset link only lets the Set new password page
      // change the password. Supabase shares it with every open tab, so
      // here it counts as "not logged in".
      const { data } = supabase.auth.onAuthStateChange((event, session) => {
        const resetOnly =
          event === "PASSWORD_RECOVERY" || resetIsPending() || madeByResetLink(session);
        setUser(resetOnly ? null : (session?.user ?? null));
        setReady(true);
      });
      stopListening = () => data.subscription.unsubscribe();
    }
    start();

    return () => {
      cancelled = true;
      stopListening();
    };
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

// "Remember my email" (ticket 45).
//
// Everyone stays logged in until they log out (Supabase's normal
// behaviour). When the traveler ticks "Remember my email" at log-in, this
// browser keeps their email (never the password), so the login page
// comes back with the email filled in and the box ticked after they log
// out. Logging in with the box unticked forgets it again.
const REMEMBERED_EMAIL = "lakat-remembered-email";

// Call right after a successful log-in.
export function rememberEmail(remember: boolean, email: string) {
  try {
    if (remember) {
      localStorage.setItem(REMEMBERED_EMAIL, email.trim());
    } else {
      localStorage.removeItem(REMEMBERED_EMAIL);
    }
  } catch {
    // Storage blocked (some private windows): nothing is remembered.
  }
}

// The email saved by "Remember my email", or "" if there is none.
export function rememberedEmail() {
  try {
    return localStorage.getItem(REMEMBERED_EMAIL) ?? "";
  } catch {
    return "";
  }
}

// Password reset (ticket 46).
//
// Opening the link from a reset email logs the traveler in: that is how
// the Set new password page is allowed to change their password. That
// login should only count once they have saved a new password. So while
// the reset is in progress we remember RESET_PENDING, and any other page
// (useCurrentUser above) logs them out instead of letting them in.
const RESET_PENDING = "lakat-reset-pending";

// The reset link worked: the login it made is for resetting only.
export function startPasswordReset() {
  try {
    localStorage.setItem(RESET_PENDING, "1");
  } catch {
    // Storage blocked: nothing we can remember.
  }
}

// The new password is saved (or the reset login has been removed).
export function endPasswordReset() {
  try {
    localStorage.removeItem(RESET_PENDING);
  } catch {
    // Nothing to forget if storage is blocked.
  }
}

export function resetIsPending() {
  try {
    return localStorage.getItem(RESET_PENDING) === "1";
  } catch {
    return false;
  }
}

// True when this login came from a reset link. Supabase records how each
// login was made in its access token ("amr"); reset links say "recovery".
function madeByResetLink(session: Session | null) {
  if (!session) return false;
  try {
    const payload = session.access_token.split(".")[1];
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    const amr: unknown = JSON.parse(json).amr;
    return (
      Array.isArray(amr) &&
      amr.some((entry) => typeof entry === "object" && entry !== null && entry.method === "recovery")
    );
  } catch {
    return false;
  }
}

