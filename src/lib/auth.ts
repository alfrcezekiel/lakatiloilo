"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { createClient } from "@/lib/supabase/client";
import { getMe, type Traveler } from "@/lib/api";

export type { Traveler };

// The website's own copy of the traveler's login (own login round,
// ticket 53). The backend hands it over at log-in; the website keeps it in
// this browser and sends it to the backend, instead of giving it to
// Supabase's browser library. So normal pages never talk to Supabase Auth.
//
// It is kept in localStorage, so the traveler stays logged in until they
// log out (and other open tabs can see it change). Supabase's library kept
// it where the page could read it too, so this is no less safe.
export interface SavedLogin {
  access_token: string;
  refresh_token: string;
  // When the access token runs out, in seconds since 1970 (ticket 54
  // renews it before then).
  expires_at: number | null;
}

const LOGIN_KEY = "lakat-login";
// Tells components in this tab that the login changed. (Other tabs hear
// about it through the browser's own "storage" event.)
const LOGIN_CHANGED = "lakat-login-changed";

export function readLogin(): SavedLogin | null {
  try {
    const saved = JSON.parse(localStorage.getItem(LOGIN_KEY) ?? "null");
    if (typeof saved?.access_token === "string" && typeof saved?.refresh_token === "string") {
      return saved as SavedLogin;
    }
  } catch {
    // Storage blocked or the saved value is damaged: treat as logged out.
  }
  return null;
}

// Keep the login the backend handed back at log-in.
export function saveLogin(login: { access_token: string; refresh_token: string; expires_at?: number | null }) {
  const saved: SavedLogin = {
    access_token: login.access_token,
    refresh_token: login.refresh_token,
    expires_at: login.expires_at ?? null,
  };
  try {
    localStorage.setItem(LOGIN_KEY, JSON.stringify(saved));
  } catch {
    // Storage blocked (some private windows): the traveler cannot stay
    // logged in, but nothing breaks.
  }
  window.dispatchEvent(new Event(LOGIN_CHANGED));
}

// Forget the login in this browser (log out, or the login has ended).
export function forgetLogin() {
  try {
    localStorage.removeItem(LOGIN_KEY);
  } catch {
    // Nothing to forget if storage is blocked.
  }
  window.dispatchEvent(new Event(LOGIN_CHANGED));
}

// Who is logged in right now, for any "use client" component.
// `user` is null when nobody is logged in. `ready` is false for a moment
// while the login is checked, so the page can wait instead of flashing
// "Log in" at someone who is already logged in.
//
// The traveler's details (name, traveler type) come from the backend's
// "who is logged in" endpoint. It runs again whenever the login changes,
// in this tab or another one.
export function useCurrentUser() {
  const [user, setUser] = useState<Traveler | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    // Counts login changes, so an older answer from the backend never
    // replaces a newer one (for example, logging out while it answers).
    let latest = 0;

    const check = async () => {
      const change = ++latest;
      const login = readLogin();
      const traveler = login ? await travelerFor(login.access_token) : null;
      if (cancelled || change !== latest) return;
      // The backend says this login is no longer valid: forget it.
      if (login && !traveler) forgetLogin();
      setUser(traveler);
      setReady(true);
    };

    const onStorage = (event: StorageEvent) => {
      if (event.key === LOGIN_KEY || event.key === null) check();
    };

    // A reset link left Supabase's own login behind without a new password
    // being saved: remove it (it is only for the Set new password page).
    if (resetIsPending() && !window.location.pathname.startsWith("/reset-password")) {
      createClient()
        .auth.signOut({ scope: "local" })
        .finally(endPasswordReset);
    }

    check();
    window.addEventListener(LOGIN_CHANGED, check);
    window.addEventListener("storage", onStorage);
    return () => {
      cancelled = true;
      window.removeEventListener(LOGIN_CHANGED, check);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  return { user, ready };
}

// The logged-in traveler's login token, which the backend needs to add,
// edit or delete their reviews; null when nobody is logged in.
export async function loginToken() {
  return readLogin()?.access_token ?? null;
}

// The name to show for the logged-in traveler, for example in the navbar.
export function displayNameOf(user: Traveler) {
  return user.display_name;
}

// One "who is logged in" request per login, shared by every component on
// the page (the navbar, the Reviews section, ...), so the backend is asked
// once, not once per component. Answers null when the backend says the
// login is no longer valid (401).
let meRequest: { token: string; answer: Promise<Traveler | null> } | null = null;

function travelerFor(token: string): Promise<Traveler | null> {
  if (meRequest?.token !== token) {
    meRequest = {
      token,
      answer: getMe(token).catch((error) => {
        if (axios.isAxiosError(error) && error.response?.status === 401) return null;
        // The backend cannot be reached: fall back to the details inside
        // the login itself, so the navbar still works.
        return travelerFromToken(token);
      }),
    };
  }
  return meRequest.answer;
}

// The traveler's details from inside the login token (Supabase writes the
// account id, email and sign-up details into it). Only used when the
// backend cannot be reached.
function travelerFromToken(token: string): Traveler | null {
  try {
    const payload = token.split(".")[1];
    const claims = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    const email: string | null = typeof claims.email === "string" ? claims.email : null;
    const name = claims.user_metadata?.display_name;
    const type = claims.user_metadata?.traveler_type;
    if (typeof claims.sub !== "string") return null;
    return {
      id: claims.sub,
      email,
      display_name:
        typeof name === "string" && name.trim() ? name.trim() : (email?.split("@")[0] ?? "Traveler"),
      traveler_type: typeof type === "string" ? type : null,
    };
  } catch {
    return null;
  }
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
// Everyone stays logged in until they log out. When the traveler ticks "Remember my email" at log-in, this
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
// the reset is in progress we remember RESET_PENDING. The website's own
// login (above) never uses that Supabase login, and if the traveler leaves
// without saving, any other page removes it (see useCurrentUser).
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
