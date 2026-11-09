// The admin's login, as a cookie for the server's admin check (ticket 107,
// team request 2026-11-08: a real 404 for /admin).
//
// The website keeps logins in this browser's storage, which the server
// cannot see, so on its own the server answered 200 for /admin and only
// the page's JavaScript showed "not found". The admin sign-in also puts
// the login in this cookie; the proxy (src/proxy.ts) sends it to the
// backend before any admin page is served, and answers 404 unless the
// backend says it belongs to an admin.
//
// - Only sent to /admin pages (Path=/admin), never to other sites
//   (SameSite=Strict), only over HTTPS on the live site (Secure).
// - It holds the same login the page already keeps in storage, so it
//   exposes nothing new. It runs out with the login; a renewed login
//   replaces it, and logging out removes it.
// - Travelers never get one: only the admin sign-in sets it.
export const ADMIN_COOKIE = "lakat-admin-login";

function write(value: string, maxAgeSeconds: number) {
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie =
    `${ADMIN_COOKIE}=${encodeURIComponent(value)}; Path=/admin; Max-Age=${maxAgeSeconds}` +
    `; SameSite=Strict${secure}`;
}

// "The login in this browser is an admin's", kept next to the login in
// localStorage (code review 2026-11-09). The cookie itself cannot be used
// for this: a page only sees the cookies for its own path, so on the main
// site the /admin cookie looked missing and renewing the login there never
// renewed the cookie. After about an hour the admin then got "not found"
// at /admin while still signed in. It only decides whether the cookie is
// renewed; the backend still decides who is an admin.
const ADMIN_MARK = "lakat-admin";

export function isAdminBrowser() {
  try {
    return localStorage.getItem(ADMIN_MARK) === "1";
  } catch {
    return false;
  }
}

// Keep the admin's login for the server check, until it runs out
// (expiresAt in seconds since 1970; an hour when unknown).
export function setAdminCookie(accessToken: string, expiresAt: number | null | undefined) {
  const seconds = expiresAt ? Math.floor(expiresAt - Date.now() / 1000) : 3600;
  if (seconds > 0) write(accessToken, seconds);
  try {
    localStorage.setItem(ADMIN_MARK, "1");
  } catch {
    // Storage blocked: the cookie still works until it runs out.
  }
}

export function clearAdminCookie() {
  write("", 0);
  try {
    localStorage.removeItem(ADMIN_MARK);
  } catch {
    // Nothing to forget.
  }
}
