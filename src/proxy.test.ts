import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { proxy } from "./proxy";

// The Content-Security-Policy every page gets (tickets 154–156). The admin
// check's backend call is pretend, so nothing leaves the computer, and the
// Supabase project address is a pretend one, never the real one.
beforeEach(() => vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://pretend-project.supabase.co"));
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

const policyFor = async (path: string) => {
  const response = await proxy(new NextRequest(`http://localhost:3000${path}`));
  return {
    enforced: response.headers.get("content-security-policy"),
    reportOnly: response.headers.get("content-security-policy-report-only"),
    // What Next.js receives, to stamp the nonce on its own scripts.
    toNext: response.headers.get("x-middleware-request-content-security-policy"),
    nonceToNext: response.headers.get("x-middleware-request-x-nonce"),
  };
};
const nonceIn = (policy: string | null) => /script-src [^;]*'nonce-([A-Za-z0-9+/=]+)'/.exec(policy ?? "")?.[1];

describe("Content-Security-Policy", () => {
  it("is enforced on a traveler page, not only reported", async () => {
    const { enforced, reportOnly } = await policyFor("/");

    expect(reportOnly).toBeNull();
    expect(enforced).toContain("default-src 'self'");
    expect(enforced).toContain("frame-ancestors 'none'");
    expect(enforced).toContain("object-src 'none'");
  });

  it("keeps the addresses the app needs: our Supabase project's Realtime and photos, previews, Wikimedia, Unsplash", async () => {
    const { enforced } = await policyFor("/destinations/some-place");

    expect(enforced).toContain(
      "connect-src 'self' https://pretend-project.supabase.co wss://pretend-project.supabase.co",
    );
    expect(enforced).toMatch(/img-src [^;]*blob:/);
    expect(enforced).toMatch(/img-src [^;]*https:\/\/pretend-project\.supabase\.co/);
    expect(enforced).toMatch(/img-src [^;]*https:\/\/thumb\.wikimedia\.org/);
    expect(enforced).toMatch(/img-src [^;]*https:\/\/images\.unsplash\.com/);
  });

  it("lets review videos play from our own Supabase project only, and previews from blob: (ticket 165)", async () => {
    const { enforced } = await policyFor("/destinations/1");

    expect(enforced).toMatch(/media-src 'self' blob: https:\/\/pretend-project\.supabase\.co(;|$)/);
    expect(enforced).not.toMatch(/media-src [^;]*\*/);
  });

  it("lets the map load: Mapbox styles, tiles and its blob: worker (glass detail pages round)", async () => {
    const { enforced } = await policyFor("/destinations/some-place");

    expect(enforced).toMatch(/connect-src [^;]*https:\/\/api\.mapbox\.com/);
    expect(enforced).toMatch(/connect-src [^;]*https:\/\/\*\.tiles\.mapbox\.com/);
    expect(enforced).toMatch(/img-src [^;]*https:\/\/api\.mapbox\.com/);
    expect(enforced).toContain("worker-src 'self' blob:");
  });

  it("trusts only our own Supabase project, not every *.supabase.co site", async () => {
    const { enforced } = await policyFor("/");

    expect(enforced).not.toContain("*.supabase.co");
  });

  it("never allows unsafe-eval outside development", async () => {
    const { enforced } = await policyFor("/");

    expect(enforced).not.toContain("unsafe-eval");
  });

  it("lets only scripts and styles that carry this page view's nonce run, never any inline script (ZAP 2026-11-20)", async () => {
    vi.stubEnv("NODE_ENV", "production");

    const { enforced } = await policyFor("/");

    const nonce = nonceIn(enforced);
    expect(nonce, "no nonce in script-src").toBeDefined();
    expect(nonce!.length).toBeGreaterThanOrEqual(22);
    expect(enforced).toMatch(new RegExp(`script-src 'self' 'nonce-${nonce!.replace(/[+/=]/g, "\\$&")}'(;|$)`));
    expect(enforced).toContain(`style-src 'self' 'nonce-${nonce}'`);
    // Only style="..." attributes may be inline; they cannot run code.
    expect(enforced).toContain("style-src-attr 'unsafe-inline'");
    expect(enforced!.replace("style-src-attr 'unsafe-inline'", "")).not.toContain("unsafe-inline");
  });

  it("on the dev server, loosens only 'unsafe-eval' and inline <style>; scripts still need the nonce", async () => {
    vi.stubEnv("NODE_ENV", "development");

    const { enforced } = await policyFor("/");

    // The two things `npm run dev` can't work without (tried 2026-11-20).
    expect(enforced).toMatch(/script-src 'self' 'nonce-[^']+' 'unsafe-eval'(;|$)/);
    expect(enforced).toContain("style-src 'self' 'unsafe-inline'");
    // Everything else stays as strict as the live site.
    expect(enforced).not.toMatch(/script-src [^;]*'unsafe-inline'/);
    expect(enforced).toContain("object-src 'none'");
    expect(enforced).toContain("frame-ancestors 'none'");
  });

  it("gives every page view a different nonce", async () => {
    const first = nonceIn((await policyFor("/")).enforced);
    const second = nonceIn((await policyFor("/")).enforced);

    expect(first).not.toBe(second);
  });

  it("hands Next.js the same policy and nonce, so its own scripts carry the code", async () => {
    const { enforced, toNext, nonceToNext } = await policyFor("/login");

    expect(toNext).toBe(enforced);
    expect(nonceToNext).toBe(nonceIn(enforced));
  });

  it("is also set on the admin not-found answer for a visitor without a login", async () => {
    const fetch = vi.spyOn(globalThis, "fetch");

    const { enforced } = await policyFor("/admin/reviews");

    expect(enforced).toContain("default-src 'self'");
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe("Maintenance mode and the staging site", () => {
  it("shows the maintenance page with status 503 for every page when MAINTENANCE_MODE is true", async () => {
    vi.stubEnv("MAINTENANCE_MODE", "true");

    const response = await proxy(new NextRequest("http://localhost:3000/destinations/some-place"));

    expect(response.status).toBe(503);
    expect(response.headers.get("x-middleware-rewrite")).toBe("http://localhost:3000/maintenance");
    expect(response.headers.get("content-security-policy")).toContain("default-src 'self'");
  });

  it("still serves files such as the icon during maintenance", async () => {
    vi.stubEnv("MAINTENANCE_MODE", "true");

    const response = await proxy(new NextRequest("http://localhost:3000/icon.png"));

    expect(response.headers.get("x-middleware-rewrite")).toBeNull();
  });

  it("serves pages normally when MAINTENANCE_MODE is not set", async () => {
    const response = await proxy(new NextRequest("http://localhost:3000/"));

    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-rewrite")).toBeNull();
  });

  it("asks search engines not to list the staging site, and only the staging site", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_ENV", "staging");
    const staging = await proxy(new NextRequest("http://localhost:3000/"));
    vi.stubEnv("NEXT_PUBLIC_APP_ENV", "production");
    const production = await proxy(new NextRequest("http://localhost:3000/"));

    expect(staging.headers.get("x-robots-tag")).toBe("noindex, nofollow");
    expect(production.headers.get("x-robots-tag")).toBeNull();
  });
});

describe("Content-Security-Policy with the local Supabase stack", () => {
  it("allows the local stack's address and its ws:// Realtime connection", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:54321");

    const { enforced } = await policyFor("/");

    expect(enforced).toContain("connect-src 'self' http://127.0.0.1:54321 ws://127.0.0.1:54321");
  });
});
