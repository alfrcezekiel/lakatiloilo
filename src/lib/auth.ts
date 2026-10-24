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
    let stopListening = () => {};
    let cancelled = false;

    async function start() {
      // Log out first, so the page never shows them logged in, when:
      //   - "Keep me logged in" was unticked and the browser has been
      //     closed since, or
      //   - they opened a reset link but left without saving a new
      //     password (that login is only for the Set new password page).
      if (loginShouldEnd() || resetIsPending()) {
        await supabase.auth.signOut({ scope: "local" });
        forgetShortLogin();
        endPasswordReset();
      }
      if (cancelled) return;
      // Runs once straight away with the current login, then again
      // whenever someone logs in or out (in this tab or another one).
      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user ?? null);
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

// "Keep me logged in" (ticket 45).
//
// Supabase keeps everyone logged in for a long time. When the traveler
// unticks the box, we remember two things:
//   - SHORT_LOGIN in localStorage, which survives closing the browser:
//     "this login should end when the browser closes".
//   - BROWSER_OPEN, a cookie with no expiry date. Browsers delete such
//     cookies when they close, so it means "the browser is still open".
// On the next visit, SHORT_LOGIN without BROWSER_OPEN means the browser
// was closed in between, so useCurrentUser logs the traveler out.
//
// Ticked, we also remember the traveler's email (never the password), so
// the login page comes back with the email filled in and the box ticked
// after they log out. Logging in with the box unticked forgets it again.
const SHORT_LOGIN = "lakat-short-login";
const BROWSER_OPEN = "lakat-browser-open";
const REMEMBERED_EMAIL = "lakat-remembered-email";

// Call right after a successful log-in or sign-up.
export function rememberLoginChoice(keepLoggedIn: boolean, email: string) {
  try {
    if (keepLoggedIn) {
      forgetShortLogin();
      localStorage.setItem(REMEMBERED_EMAIL, email.trim());
    } else {
      localStorage.removeItem(REMEMBERED_EMAIL);
      localStorage.setItem(SHORT_LOGIN, "1");
      const secure = location.protocol === "https:" ? "; Secure" : "";
      document.cookie = `${BROWSER_OPEN}=1; path=/; SameSite=Lax${secure}`;
    }
  } catch {
    // Storage blocked (some private windows): stay logged in as before.
  }
}

function loginShouldEnd() {
  try {
    return (
      localStorage.getItem(SHORT_LOGIN) === "1" &&
      !document.cookie.split("; ").some((c) => c.startsWith(`${BROWSER_OPEN}=`))
    );
  } catch {
    return false;
  }
}

function forgetShortLogin() {
  try {
    localStorage.removeItem(SHORT_LOGIN);
  } catch {
    // Nothing to forget if storage is blocked.
  }
}

// The email saved by a "Keep me logged in" login, or "" if there is none.
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
