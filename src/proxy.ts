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
// Report-only for now: the browser only warns in the console, so ticket 155
// can find what is missing before ticket 156 switches it on for real.
//   - 'unsafe-inline' scripts: Next.js puts small inline scripts in each page.
//   - 'unsafe-eval' in development only: `npm run dev` needs it, the live site not.
//   - blob: images: the review and admin photo pickers preview a photo before upload.
//   - wss://*.supabase.co: Supabase Realtime (live updates) uses a WebSocket.
const CSP_HEADER = "Content-Security-Policy-Report-Only";
const CSP = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  // Place photos come from Supabase Storage and Wikimedia (thumb. serves the
  // resized copies); the hero and category cards use Unsplash photos.
  "img-src 'self' data: blob: https://*.supabase.co https://upload.wikimedia.org https://thumb.wikimedia.org https://images.unsplash.com",
  "font-src 'self'",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
  "frame-src 'none'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAdminPage =
    (pathname === "/admin" || pathname.startsWith("/admin/")) && pathname !== "/admin/login";
  // Every answer gets the policy, including the admin "not found" rewrite.
  const response = isAdminPage ? await handleAdmin(request) : NextResponse.next();
  response.headers.set(CSP_HEADER, CSP);
  return response;
}

async function handleAdmin(request: NextRequest) {
  const token = request.cookies.get(ADMIN_COOKIE)?.value;
  // Moving between pages inside the site, or preloading one: only the
  // page's code, no data (see above). Only with the admin cookie, which
  // real admin clicks always carry and travelers never have (code review
  // 2026-11-09: without it, anyone adding the header got 200, not 404).
  if (token && (request.headers.get("rsc") === "1" || request.headers.has("next-router-prefetch"))) {
    return NextResponse.next();
  }
  if (token && (await isAdmin(token))) return NextResponse.next();
  return NextResponse.rewrite(new URL(NOT_FOUND, request.url));
}

// Every page, but not /api (JSON, not pages), Next.js's own files or the icon.
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
