"use client";

import { logOutThroughBackend, refreshLogin } from "@/lib/api";
import { endPasswordReset } from "@/lib/auth";
import { hasRunOut, type SavedLogin } from "@/lib/login";

// Old Supabase logins (own login round, code review).
//
// Before this round, Supabase's browser library kept the login in a
// "sb-<project>-auth-token" cookie. A reset link still leaves one behind
// for the Set new password page. Its renewal code never runs out by
// itself, so once per page load, anywhere except the password-reset pages,
// the website ends that login through the backend and deletes the cookie.
let oldLoginChecked = false;

export function endOldSupabaseLogin() {
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
