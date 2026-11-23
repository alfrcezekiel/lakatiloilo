import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE, GET, POST } from "./route";

// The proxy's safety rules (ticket 151). The backend is pretend: fetch is
// replaced, so nothing leaves the computer.
const BACKEND = "http://backend.example.test";
const call = (handler: typeof GET, url: string, path: string[], init?: RequestInit) =>
  handler(new Request(`http://localhost:3000${url}`, init), { params: Promise.resolve({ path }) });

beforeEach(() => vi.stubEnv("API_URL", BACKEND));
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("backend proxy", () => {
  it("refuses paths outside v1/ without calling the backend", async () => {
    const fetch = vi.spyOn(globalThis, "fetch");
    expect((await call(GET, "/api/admin", ["admin"])).status).toBe(404);
    expect((await call(GET, "/api/v1/../secret", ["v1", "..", "secret"])).status).toBe(404);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("forwards the path, query and only the safe headers", async () => {
    const fetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json([{ id: "1" }], { headers: { "Set-Cookie": "secret=1", "Cache-Control": "no-store" } }),
    );
    const response = await call(GET, "/api/v1/reviews?place=a%20b", ["v1", "reviews"], {
      headers: { Authorization: "Bearer pretend", Cookie: "private=1", Host: "evil.test" },
    });

    const [target, init] = fetch.mock.calls[0];
    expect(target).toBe(`${BACKEND}/v1/reviews?place=a%20b`);
    const sent = new Headers(init?.headers);
    expect(sent.get("authorization")).toBe("Bearer pretend");
    expect(sent.get("cookie")).toBeNull();
    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual([{ id: "1" }]);
  });

  it("adds the staging pass on the server and ignores one sent by a browser", async () => {
    // The test runner imitates a browser; the proxy really runs on a server.
    vi.stubGlobal("window", undefined);
    vi.stubEnv("BACKEND_PROTECTION_BYPASS", "pretend-server-pass");
    const fetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json([]));

    const response = await call(GET, "/api/v1/places", ["v1", "places"], {
      headers: { "x-vercel-protection-bypass": "pretend-browser-pass" },
    });

    expect(new Headers(fetch.mock.calls[0][1]?.headers).get("x-vercel-protection-bypass")).toBe("pretend-server-pass");
    expect(response.headers.get("x-vercel-protection-bypass")).toBeNull();
  });

  it("never passes on a browser's bypass header when no pass is set", async () => {
    const fetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json([]));

    await call(GET, "/api/v1/places", ["v1", "places"], {
      headers: { "x-vercel-protection-bypass": "pretend-browser-pass" },
    });

    expect(new Headers(fetch.mock.calls[0][1]?.headers).get("x-vercel-protection-bypass")).toBeNull();
  });

  it("forwards upload bytes unchanged", async () => {
    const fetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({}, { status: 201 }));
    const bytes = new Uint8Array([0xff, 0xd8, 0x00, 0xe9]);
    await call(POST, "/api/v1/reviews/1/photos", ["v1", "reviews", "1", "photos"], {
      method: "POST",
      body: bytes,
      headers: { "Content-Type": "multipart/form-data; boundary=x" },
    });
    expect(new Uint8Array(fetch.mock.calls[0][1]?.body as ArrayBuffer)).toEqual(bytes);
  });

  it("answers 204 with no body, and 504 or 502 when the backend does not answer", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response(null, { status: 204 }));
    expect((await call(DELETE, "/api/v1/reviews/1", ["v1", "reviews", "1"], { method: "DELETE" })).status).toBe(204);

    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new DOMException("slow", "TimeoutError"));
    expect((await call(GET, "/api/v1/places", ["v1", "places"])).status).toBe(504);

    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new TypeError("fetch failed"));
    expect((await call(GET, "/api/v1/places", ["v1", "places"])).status).toBe(502);
  });

  it("says the server is not configured when API_URL is missing", async () => {
    vi.stubEnv("API_URL", "");
    expect((await call(GET, "/api/v1/places", ["v1", "places"])).status).toBe(500);
  });
});
