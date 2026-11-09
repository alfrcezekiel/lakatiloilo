"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { getMe, logOutThroughBackend, refreshLogin, type Traveler } from "@/lib/api";
import { clearAdminCookie, isAdminBrowser, setAdminCookie } from "@/lib/admin-cookie";

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
  // An admin's renewed login also replaces the cookie the server checks
  // before admin pages (ticket 107), on whichever page it is renewed.
  // Travelers have no such cookie.
  if (isAdminBrowser()) setAdminCookie(saved.access_token, saved.expires_at);
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
  clearAdminCookie();
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
// "who is logged in" endpoint, through TanStack Query (navigation round,
// ticket 63). Its cache keeps one answer per login, shared by every
// component (the navbar, the Reviews section, ...). So after the first
// check, moving between pages shows the name straight away. Logging in or
// out, in this tab or another, changes the login, which asks again.
export function useCurrentUser() {
  // The current login token: null when logged out, undefined while the
  // page is still being built on the server (it cannot read this browser).
  const token = useSyncExternalStore(subscribeToLogin, currentToken, () => undefined);

  const query = useQuery({
    queryKey: ["who-is-logged-in", token],
    queryFn: () => travelerFor(token as string),
    enabled: typeof token === "string",
    // The answer only changes when the login changes, and a new login is a
    // new key. So never ask again for the same login, and keep the answer
    // for as long as the page is open.
    staleTime: Infinity,
    gcTime: Infinity,
    // When the login is renewed (about once an hour) the token changes but
    // the traveler is the same: keep showing their name meanwhile, instead
    // of a brief "checking" moment. Never for a different traveler.
    placeholderData: (previous) =>
      previous && typeof token === "string" && previous.id === accountIdOf(token)
        ? previous
        : undefined,
  });

  // Start the renewal timer. (Old Supabase logins are ended by
  // src/lib/old-supabase-login.ts, run once per page from Providers.)
  useEffect(() => {
    scheduleRenewal();
  }, []);

  if (token === undefined) return { user: null, ready: false };
  if (token === null) return { user: null, ready: true };
  return { user: query.data ?? null, ready: query.data !== undefined };
}

// Lets React re-read the login when it changes: in this tab (our own
// event) or in another tab (the browser's "storage" event).
function subscribeToLogin(onChange: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === LOGIN_KEY || event.key === null) onChange();
  };
  window.addEventListener(LOGIN_CHANGED, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(LOGIN_CHANGED, onChange);
    window.removeEventListener("storage", onStorage);
  };
}

function currentToken() {
  return readLogin()?.access_token ?? null;
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

// True once the login has run out (renewal is then overdue). Also used by
// src/lib/old-supabase-login.ts.
export function hasRunOut(login: SavedLogin) {
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

// Asks the backend who this login belongs to. TanStack Query calls it once
// per login. Answers null when the backend says the login is no longer
// valid (401): the login is then forgotten, and the page shows "Log in".
async function travelerFor(token: string): Promise<Traveler | null> {
  // The login has run out and renewal has not managed yet (for example,
  // the site was opened again the next day, or Supabase is busy). Asking
  // the backend now would answer 401 and log the traveler out by mistake.
  // Show the name inside the login and renew; the renewed login is a new
  // key, so it is asked about properly then.
  const saved = readLogin();
  if (saved?.access_token === token && hasRunOut(saved)) {
    void freshToken();
    return fromTokenOrForget(token);
  }
  try {
    return await getMe(token);
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      forgetLogin();
      return null;
    }
    // The backend cannot be reached: fall back to the details inside the
    // login itself, so the navbar still works.
    return fromTokenOrForget(token);
  }
}

// The details inside the login; a login that cannot even be read is
// forgotten, as before.
function fromTokenOrForget(token: string) {
  const traveler = travelerFromToken(token);
  if (!traveler) forgetLogin();
  return traveler;
}

// The account id inside a login token, to tell whether two logins belong
// to the same traveler.
function accountIdOf(token: string) {
  return travelerFromToken(token)?.id ?? null;
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
