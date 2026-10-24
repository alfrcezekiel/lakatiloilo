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
      await endShortLoginIfOver();
      if (resetIsPending()) {
        await supabase.auth.signOut({ scope: "local" });
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
// unticks the box, their login should end when they close the browser.
// A website is never told "the browser closed", so we work it out the
// next time a Lakat Iloilo page opens. We remember:
//   - SHORT_LOGIN (localStorage): "end this login when the browser closes".
//   - BROWSER_OPEN: a cookie with no expiry date. Browsers delete such
//     cookies when they close... unless they reopen old tabs ("Continue
//     where you left off"), which Brave and Chrome can do.
//   - LAST_LEFT (localStorage): when a Lakat page was last closed or
//     hidden. Pages write it as they close; no timer runs in between.
// When a page opens with SHORT_LOGIN set, the browser counts as closed
// (and the login ends) if:
//   - BROWSER_OPEN is gone, or
//   - the last Lakat page closed more than 10 seconds ago AND no other
//     Lakat tab answers "anyone still open?". A refresh or a quick move
//     between pages comes back within 10 seconds, so it never counts.
//
// Ticked, we also remember the traveler's email (never the password), so
// the login page comes back with the email filled in and the box ticked
// after they log out. Logging in with the box unticked forgets it again.
const SHORT_LOGIN = "lakat-short-login";
const BROWSER_OPEN = "lakat-browser-open";
const REMEMBERED_EMAIL = "lakat-remembered-email";
const LAST_LEFT = "lakat-last-left";
const REOPEN_GRACE_MS = 10 * 1000; // a refresh comes back well within this
const ANSWER_WAIT_MS = 400; // how long to wait for another tab to answer

// Call right after a successful log-in or sign-up.
export function rememberLoginChoice(keepLoggedIn: boolean, email: string) {
  try {
    if (keepLoggedIn) {
      forgetShortLogin();
      localStorage.setItem(REMEMBERED_EMAIL, email.trim());
    } else {
      localStorage.removeItem(REMEMBERED_EMAIL);
      localStorage.setItem(SHORT_LOGIN, "1");
      localStorage.setItem(LAST_LEFT, String(Date.now()));
      const secure = location.protocol === "https:" ? "; Secure" : "";
      document.cookie = `${BROWSER_OPEN}=1; path=/; SameSite=Lax${secure}`;
    }
  } catch {
    // Storage blocked (some private windows): stay logged in as before.
  }
}

// Open Lakat tabs talk to each other on this channel, so a newly opened
// page can ask whether any other Lakat tab is still open.
let tabs: BroadcastChannel | null = null;

// Run once on each page: answer other tabs, and note the time when this
// page closes or is hidden. Safe to call more than once.
export function watchLakatTabs() {
  if (tabs || typeof BroadcastChannel === "undefined") return;
  tabs = new BroadcastChannel("lakat-tabs");
  tabs.onmessage = (event) => {
    if (event.data === "anyone-open?") tabs?.postMessage("still-open");
  };
  const noteLeaving = () => {
    try {
      if (localStorage.getItem(SHORT_LOGIN) === "1") {
        localStorage.setItem(LAST_LEFT, String(Date.now()));
      }
    } catch {
      // Storage blocked: nothing to write.
    }
  };
  window.addEventListener("pagehide", noteLeaving);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") noteLeaving();
  });
}

// Asks the other Lakat tabs "anyone still open?" and waits briefly.
function anotherTabIsOpen(): Promise<boolean> {
  return new Promise((resolve) => {
    if (!tabs) return resolve(false);
    const channel = tabs;
    const timer = setTimeout(() => {
      channel.removeEventListener("message", onAnswer);
      resolve(false);
    }, ANSWER_WAIT_MS);
    function onAnswer(event: MessageEvent) {
      if (event.data !== "still-open") return;
      clearTimeout(timer);
      channel.removeEventListener("message", onAnswer);
      resolve(true);
    }
    channel.addEventListener("message", onAnswer);
    channel.postMessage("anyone-open?");
  });
}

async function loginShouldEnd() {
  try {
    if (localStorage.getItem(SHORT_LOGIN) !== "1") return false;
    const browserOpen = document.cookie
      .split("; ")
      .some((c) => c.startsWith(`${BROWSER_OPEN}=`));
    if (!browserOpen) return true;
    const lastLeft = Number(localStorage.getItem(LAST_LEFT) ?? 0);
    if (Date.now() - lastLeft < REOPEN_GRACE_MS) return false;
    return !(await anotherTabIsOpen());
  } catch {
    return false;
  }
}

// Runs once per page load (the result is kept and shared by every caller
// on the page): ends an unticked login if the browser was closed.
let shortLoginCheck: Promise<void> | null = null;

export function endShortLoginIfOver() {
  if (!shortLoginCheck) {
    shortLoginCheck = (async () => {
      watchLakatTabs();
      if (await loginShouldEnd()) {
        await createClient().auth.signOut({ scope: "local" });
        forgetShortLogin();
      }
    })();
  }
  return shortLoginCheck;
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
