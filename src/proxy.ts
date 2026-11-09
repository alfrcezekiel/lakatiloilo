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

const ADMIN_COOKIE = "lakat-admin-login";
// An address with no page behind it: rewriting to it makes Next.js answer
// with the site's not-found page and status 404, while the browser keeps
// showing the address that was asked for.
const NOT_FOUND = "/_not-found-admin";

async function isAdmin(accessToken: string) {
  const backend = process.env.NEXT_PUBLIC_API_URL;
  if (!backend) return false;
  try {
    const response = await fetch(`${backend}/v1/admin/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname === "/admin/login") return NextResponse.next();
  const token = request.cookies.get(ADMIN_COOKIE)?.value;
  if (token && (await isAdmin(token))) return NextResponse.next();
  return NextResponse.rewrite(new URL(NOT_FOUND, request.url));
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
