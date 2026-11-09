"use client";

import { useEffect } from "react";
import { getMe } from "@/lib/api";
import { clearAdminCookie, setAdminCookie } from "@/lib/admin-cookie";
import { freshToken, readLogin } from "@/lib/login";

// Shown on the "not found" page (code review 2026-11-09). The server
// answers 404 for an admin page when the admin cookie has run out, for
// example when the admin comes back the next day, even though the browser
// still holds the admin's login. Here, under /admin only, and only when
// someone is logged in in this browser:
//   - the login is renewed and the backend is asked "is this an admin?"
//     (GET /v1/auth/me, which asks the database),
//   - for an admin, the cookie is set again and the page reloads once, so
//     the dashboard opens,
//   - for anyone else nothing changes: the page stays "not found".
// At most one try per address every 30 seconds, so a failure can never
// reload in a loop.
const TRIED_KEY = "lakat-admin-recovery";
const RETRY_GAP_MS = 30_000;

export function AdminAccessRecovery() {
  useEffect(() => {
    const path = window.location.pathname;
    if (!path.startsWith("/admin") || path === "/admin/login" || !readLogin()) return;
    try {
      const last = JSON.parse(sessionStorage.getItem(TRIED_KEY) ?? "null") as
        | { path: string; at: number }
        | null;
      if (last?.path === path && Date.now() - last.at < RETRY_GAP_MS) return;
      sessionStorage.setItem(TRIED_KEY, JSON.stringify({ path, at: Date.now() }));
    } catch {
      // Without session storage there is no loop guard, so do not try.
      return;
    }

    let cancelled = false;
    void (async () => {
      const token = await freshToken();
      if (!token || cancelled) return;
      try {
        const me = await getMe(token);
        if (cancelled) return;
        if (me.is_admin) {
          setAdminCookie(token, readLogin()?.expires_at);
          window.location.reload();
        } else {
          clearAdminCookie();
        }
      } catch {
        // Backend unreachable: leave the page as it is.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
