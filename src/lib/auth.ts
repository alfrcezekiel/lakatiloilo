"use client";

// Small login helpers that are not the login itself: where to go after
// logging in, "Remember my email", and the password-reset markers. The
// website's own copy of the login lives in src/lib/login.ts.

// Where to send someone after they log in, from the ?next= part of the
// address. Only paths on this site are allowed ("/destinations/…"), so a
// crafted link cannot bounce people to another website after logging in.
//
// The text is not checked as typed, because browsers quietly change an
// address before using it: they delete tabs and newlines and read "\" as
// "/". So "/<tab>/evil.example" looked like a path here but opened
// "//evil.example", another website (open redirect found by the Playwright
// address-attack tests, 2026-11-18). Instead, the browser's own address
// reader (URL) works out where `next` would really go, and only a place on
// this site is allowed. Anything else goes to the home page.
const THIS_SITE = "https://this-site.invalid";

export function safeNextPath(next: string | null) {
  if (!next || !next.startsWith("/")) return "/";
  let target: URL;
  try {
    target = new URL(next, THIS_SITE);
  } catch {
    return "/";
  }
  if (target.origin !== THIS_SITE) return "/";
  // Rebuilt from the cleaned address, so what is used is exactly what
  // was checked.
  return `${target.pathname}${target.search}${target.hash}`;
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
// login (src/lib/login.ts) never uses that Supabase login, and if the traveler leaves
// without saving, any other page ends it through the backend (see
// endOldSupabaseLogin in src/lib/old-supabase-login.ts).
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
