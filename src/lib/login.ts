"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { getMe, logOutThroughBackend, refreshLogin, type Traveler } from "@/lib/api";
import { endPasswordReset } from "@/lib/auth";

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
  // When the access token runs out, in seconds since 1970. The website
  // renews it shortly before then (see freshToken below).
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
  scheduleRenewal();
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

// Log out (ticket 55): the website forgets its copy straight away, so the
// page shows "Log in" at once, and asks the backend to end the login on
// this device, so the copy can never be used again. If the backend cannot
// be reached, the traveler is still logged out in this browser.
export async function logOut() {
  // A login that has run out is renewed first: Supabase only ends a login
  // it still accepts.
  const token = await freshToken();
  forgetLogin();
  if (!token) return;
  try {
    await logOutThroughBackend(token);
  } catch {
    // Backend unreachable or the login had already ended: nothing more to do.
  }
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
      // Renews the login first if it has run out (for example, the site
      // was opened again the next day).
      const token = await freshToken();
      // Renewal failed for a passing reason (Supabase busy or down) and the
      // login has run out: keep the traveler logged in with the name inside
      // the login, and let the renewal timer try again. Asking the backend
      // with a run-out login would answer 401 and log them out by mistake.
      const saved = readLogin();
      const stale = !!token && !!saved && hasRunOut(saved);
      const traveler = !token ? null : stale ? travelerFromToken(token) : await travelerFor(token);
      if (cancelled || change !== latest) return;
      // The backend says this login is no longer valid: forget it.
      if (token && !traveler) forgetLogin();
      setUser(traveler);
      setReady(true);
    };

    const onStorage = (event: StorageEvent) => {
      if (event.key === LOGIN_KEY || event.key === null) check();
    };

    endOldSupabaseLogin();

    check();
    scheduleRenewal();
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
// edit or delete their reviews; null when nobody is logged in. Renewed
// first if it is about to run out.
export async function loginToken() {
  return freshToken();
}

// Keeping the login fresh (ticket 54).
//
// A login runs out after about an hour. The website renews it through the
// backend a minute before that (and whenever it finds it has run out, for
// example when a laptop wakes up), so travelers stay logged in until they
// log out. Each renewal code works only once, so two tabs must never renew
// at the same moment: the browser's "lock" makes them take turns, and the
// second one simply finds the login already renewed.
const RENEW_EARLY_SECONDS = 60;
const RETRY_SECONDS = 30;

// When this login runs out, in seconds since 1970: from the login itself,
// or from inside its token for logins saved without it.
function expiresAt(login: SavedLogin): number | null {
  if (login.expires_at) return login.expires_at;
  try {
    const payload = login.access_token.split(".")[1];
    const exp = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/"))).exp;
    return typeof exp === "number" ? exp : null;
  } catch {
    return null;
  }
}

// True once the login has run out (renewal is then overdue).
function hasRunOut(login: SavedLogin) {
  const expires = expiresAt(login);
  return expires !== null && expires <= Date.now() / 1000;
}

function needsRenewal(login: SavedLogin) {
  const expires = expiresAt(login);
  return expires !== null && expires - Date.now() / 1000 < RENEW_EARLY_SECONDS;
}

// Runs `work` while no other tab of this site is renewing. Older browsers
// without locks just run it.
function oneTabAtATime<T>(work: () => Promise<T>): Promise<T> {
  if (typeof navigator !== "undefined" && navigator.locks) {
    return navigator.locks.request("lakat-login-renewal", work) as Promise<T>;
  }
  return work();
}

let renewing: Promise<string | null> | null = null;

// The current login token, renewed first if it is about to run out. null
// when nobody is logged in, or the renewal was refused (the login is then
// forgotten, and the page shows "Log in").
export async function freshToken(): Promise<string | null> {
  const login = readLogin();
  if (!login) return null;
  if (!needsRenewal(login)) return login.access_token;
  renewing ??= oneTabAtATime(async () => {
    // Another tab may have renewed it while this one waited its turn.
    const current = readLogin();
    if (!current) return null;
    if (!needsRenewal(current)) return current.access_token;
    try {
      const { session } = await refreshLogin(current.refresh_token);
      if (!session) {
        forgetLogin();
        return null;
      }
      saveLogin(session);
      return session.access_token;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        forgetLogin();
        return null;
      }
      // The backend cannot be reached: keep the login and try again later.
      return current.access_token;
    }
  }).finally(() => {
    renewing = null;
  });
  return renewing;
}

// One timer per tab that renews the login a minute before it runs out.
let renewalTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleRenewal() {
  if (typeof window === "undefined") return;
  if (renewalTimer) clearTimeout(renewalTimer);
  renewalTimer = null;
  const login = readLogin();
  const expires = login ? expiresAt(login) : null;
  if (!expires) return;
  // Already due (for example, the last renewal failed because Supabase was
  // busy): try again in 30 seconds, never in a tight loop.
  const wait = Math.max(RETRY_SECONDS * 1000, (expires - RENEW_EARLY_SECONDS) * 1000 - Date.now());
  // Browsers cap timers at about 24 days; logins are much shorter anyway.
  renewalTimer = setTimeout(() => {
    freshToken().finally(scheduleRenewal);
  }, Math.min(wait, 2_000_000_000));
}

// Timers pause while a laptop sleeps, so check again when the page is
// looked at again.
if (typeof window !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      freshToken().finally(scheduleRenewal);
    }
  });
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

// Old Supabase logins (own login round, code review).
//
// Before this round, Supabase's browser library kept the login in a
// "sb-<project>-auth-token" cookie. A reset link still leaves one behind
// for the Set new password page. Its renewal code never runs out by
// itself, so once per page load, anywhere except the password-reset pages,
// the website ends that login through the backend and deletes the cookie.
let oldLoginChecked = false;

function endOldSupabaseLogin() {
  if (oldLoginChecked || typeof document === "undefined") return;
  oldLoginChecked = true;
  const path = window.location.pathname;
  if (path.startsWith("/reset-password") || path.startsWith("/forgot-password")) return;

  // The cookie may be split into numbered parts: sb-…-auth-token.0, .1, …
  const parts = document.cookie
    .split("; ")
    .map((pair) => {
      const at = pair.indexOf("=");
      return { name: pair.slice(0, at), value: pair.slice(at + 1) };
    })
    .filter(({ name }) => /^sb-.+-auth-token(\.\d+)?$/.test(name))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  if (parts.length === 0) {
    endPasswordReset();
    return;
  }

  const old = readOldLogin(parts.map((part) => decodeURIComponent(part.value)).join(""));
  for (const { name } of parts) {
    document.cookie = `${name}=; Max-Age=0; path=/`;
  }
  endPasswordReset();
  if (!old) return;
  // Renew first if needed (Supabase only ends a login it still accepts),
  // then end it. Any failure is fine: the cookie is already gone.
  const token = hasRunOut({ ...old, expires_at: old.expires_at ?? null })
    ? refreshLogin(old.refresh_token).then(({ session }) => session?.access_token ?? null)
    : Promise.resolve(old.access_token);
  token
    .then((accessToken) => (accessToken ? logOutThroughBackend(accessToken) : undefined))
    .catch(() => {});
}

// Reads Supabase's cookie value: JSON, sometimes written as
// "base64-" followed by the JSON in base64.
function readOldLogin(raw: string): SavedLogin | null {
  try {
    const text = raw.startsWith("base64-")
      ? atob(raw.slice(7).replace(/-/g, "+").replace(/_/g, "/"))
      : raw;
    const value = JSON.parse(text);
    if (typeof value?.access_token === "string" && typeof value?.refresh_token === "string") {
      return {
        access_token: value.access_token,
        refresh_token: value.refresh_token,
        expires_at: typeof value.expires_at === "number" ? value.expires_at : null,
      };
    }
  } catch {
    // Not readable: the cookie is deleted anyway.
  }
  return null;
}
