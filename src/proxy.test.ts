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
  };
};

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

  it("is also set on the admin not-found answer for a visitor without a login", async () => {
    const fetch = vi.spyOn(globalThis, "fetch");

    const { enforced } = await policyFor("/admin/reviews");

    expect(enforced).toContain("default-src 'self'");
    expect(fetch).not.toHaveBeenCalled();
  });
});
