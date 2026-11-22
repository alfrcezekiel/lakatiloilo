import { NextResponse, type NextRequest } from "next/server";

// Next.js proxy (until Next.js 16 called "middleware"): runs on the server
// before a page is served. Admin dashboard & moderation round, ticket 107,
// team request 2026-11-08.
//
// Every admin page except the sign-in answers with the site's "not found"
// page and a real 404 status, unless the request carries an admin's login
// (the lakat-admin-login cookie that only the admin sign-in sets, see
// src/lib/admin-cookie.ts). The backend decides whether that login is an
// admin's (GET /v1/admin/me asks the database's admins table), so nothing
// here can be faked from the browser. No cookie, a traveler's login, an
// expired login, or the backend not answering: 404, the same as an
// address that does not exist. The page itself checks again, and every
// admin endpoint refuses non-admins on its own.
//
// Faster admin pages (team report 2026-11-09: slow navigation):
//   - With the admin cookie, only a full page load (typing the address, a
//     reload, a link from outside) is checked with the backend: that is
//     the request whose status is 404.
//     Moving between dashboard pages, and Next.js quietly preloading the
//     sidebar's pages, only fetch the page's code (an "RSC" request),
//     which holds no data; the dashboard checks access in the browser
//     (AdminShell) and every data request is checked by the backend. Each
//     check here used to wait about 1.5 s for the backend.
//   - An admin's login the backend accepted is remembered for 30 seconds
//     (never past the login's own expiry), so a reload does not ask again.

const ADMIN_COOKIE = "lakat-admin-login";
// An address with no page behind it: rewriting to it makes Next.js answer
// with the site's not-found page and status 404, while the browser keeps
// showing the address that was asked for.
const NOT_FOUND = "/_not-found-admin";
const REMEMBER_MS = 30_000;
const MAX_REMEMBERED = 200;

// Accepted admin logins: token -> remembered until (milliseconds).
const accepted = new Map<string, number>();

// When the token itself says it runs out, in milliseconds (now if it
// cannot be read, so it is not remembered).
function tokenExpiryMs(token: string) {
  try {
    const part = token.split(".")[1] ?? "";
    const payload = JSON.parse(atob(part.replace(/-/g, "+").replace(/_/g, "/"))) as { exp?: unknown };
    return typeof payload.exp === "number" ? payload.exp * 1000 : Date.now();
  } catch {
    return Date.now();
  }
}

async function isAdmin(accessToken: string) {
  const until = accepted.get(accessToken);
  if (until && until > Date.now()) return true;
  accepted.delete(accessToken);

  const backend = process.env.API_URL;
  if (!backend) return false;
  try {
    const response = await fetch(`${backend}/v1/admin/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return false;
    const rememberUntil = Math.min(Date.now() + REMEMBER_MS, tokenExpiryMs(accessToken));
    if (rememberUntil > Date.now()) {
      if (accepted.size >= MAX_REMEMBERED) {
        const oldest = accepted.keys().next().value;
        if (oldest !== undefined) accepted.delete(oldest);
      }
      accepted.set(accessToken, rememberUntil);
    }
    return true;
  } catch {
    return false;
  }
}

// Content-Security-Policy (ticket 154): a list the site gives the browser of
// where pages may load scripts, styles, images and connections from. If an
// attacker ever sneaks a script into a page, the browser refuses to run it.
// Enforced (ticket 156): the browser blocks anything not on the list. It was
// report-only first (tickets 154–155) and the team checked every feature with
// no warnings. If something ever breaks, the console names the blocked
// address: add only that host below, with a comment saying what needs it.
// Emergency switch back to "only warn": set CSP_HEADER to
// "Content-Security-Policy-Report-Only" and push.
//   - Scripts: a NONCE, not 'unsafe-inline' (ZAP baseline 2026-11-20). A
//     nonce is a random one-time code, new for every page view. The proxy
//     puts it in the policy and hands it to Next.js (the x-nonce and
//     Content-Security-Policy request headers), and Next.js stamps it on
//     each of its own inline scripts. A script an attacker sneaks into the
//     page can't know the code, so the browser refuses it, inline event
//     handlers (onerror="...") included. Needs every page to be built per
//     visit (src/app/layout.tsx), because a pre-built page can't carry a
//     fresh code.
//   - Styles: a nonce for <style> tags too. Only style="..." attributes
//     (style-src-attr) stay 'unsafe-inline': React and the motion library
//     write a few of them into the HTML (opacity, position). An attribute
//     can only change how something looks, never run code.
//   - Development only (`npm run dev`, never the live site): 'unsafe-eval'
//     for React's debugging, and 'unsafe-inline' styles, because the dev
//     server injects CSS without a nonce. Scan a production build
//     (`npm run build` + `npm start`) to see what the live site sends.
//   - blob: images: the review and admin photo pickers preview a photo before upload.
//   - Mapbox (glass detail pages round, 2026-11-22): the map on the
//     destination and accommodation pages (src/components/PlaceMap.tsx).
//     api.mapbox.com serves the styles, fonts and icons, *.tiles.mapbox.com
//     the map tiles, events.mapbox.com its usage counts (part of Mapbox's
//     terms), and the map draws in a blob: worker.
//   - Supabase: only OUR project (from NEXT_PUBLIC_SUPABASE_URL), not every
//     *.supabase.co site (code review 2026-11-20): https for Storage photos
//     and Auth, wss for Realtime (live updates uses a WebSocket).
const CSP_HEADER = "Content-Security-Policy";

// Where the map (Mapbox GL) loads its styles, tiles and fonts from.
const MAPBOX = "https://api.mapbox.com https://*.tiles.mapbox.com https://events.mapbox.com";

// Our Supabase project's address, e.g. https://abcd.supabase.co, or "" if
// the variable is missing (the app's Supabase client then fails loudly).
function supabaseOrigin() {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").origin;
  } catch {
    return "";
  }
}

// A fresh random code for one page view (16 bytes, base64).
function newNonce() {
  return btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(16))));
}

export function contentSecurityPolicy(nonce: string) {
  const dev = process.env.NODE_ENV === "development";
  const supabase = supabaseOrigin();
  const realtime = supabase.replace(/^https:/, "wss:");
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}'${dev ? " 'unsafe-eval'" : ""}`,
    `style-src 'self' ${dev ? "'unsafe-inline'" : `'nonce-${nonce}'`}`,
    "style-src-attr 'unsafe-inline'",
    // Place photos come from Supabase Storage and Wikimedia (thumb. serves the
    // resized copies); the hero and category cards use Unsplash photos.
    `img-src 'self' data: blob: ${supabase} https://upload.wikimedia.org https://thumb.wikimedia.org https://images.unsplash.com ${MAPBOX}`,
    "font-src 'self'",
    `connect-src 'self' ${supabase} ${realtime} ${MAPBOX}`,
    "worker-src 'self' blob:",
    "child-src 'self' blob:",
    "frame-src 'none'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ]
    .map((directive) => directive.replace(/\s+/g, " ").trim())
    .join("; ");
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const nonce = newNonce();
  const policy = contentSecurityPolicy(nonce);
  // Next.js reads the nonce from the request's own policy header and puts
  // it on its scripts; x-nonce is for any page code that needs it.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set(CSP_HEADER, policy);

  const isAdminPage =
    (pathname === "/admin" || pathname.startsWith("/admin/")) && pathname !== "/admin/login";
  // Every answer gets the policy, including the admin "not found" rewrite.
  const response = isAdminPage ? await handleAdmin(request, requestHeaders) : NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set(CSP_HEADER, policy);
  return response;
}

async function handleAdmin(request: NextRequest, headers: Headers) {
  const next = () => NextResponse.next({ request: { headers } });
  const token = request.cookies.get(ADMIN_COOKIE)?.value;
  // Moving between pages inside the site, or preloading one: only the
  // page's code, no data (see above). Only with the admin cookie, which
  // real admin clicks always carry and travelers never have (code review
  // 2026-11-09: without it, anyone adding the header got 200, not 404).
  if (token && (request.headers.get("rsc") === "1" || request.headers.has("next-router-prefetch"))) {
    return next();
  }
  if (token && (await isAdmin(token))) return next();
  return NextResponse.rewrite(new URL(NOT_FOUND, request.url), { request: { headers } });
}

// Every page, but not the JSON and photo routes (/api/v1/..., the backend
// proxy, and /api/wikimedia-photo), Next.js's own files or the icon.
// Any other /api address is the site's "not found" PAGE, so it gets the
// policy too (ZAP baseline 2026-11-20: the old "(?!api" skipped every
// address starting with "api", and /api showed that page with no policy).
export const config = {
  matcher: ["/((?!api/v1/|api/wikimedia-photo|_next/static|_next/image|favicon.ico).*)"],
};
