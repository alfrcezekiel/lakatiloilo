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
