import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

afterEach(() => vi.restoreAllMocks());

describe("Wikimedia thumbnail relay", () => {
  it("rejects paths outside the Wikimedia thumbnail folder", async () => {
    const fetch = vi.spyOn(globalThis, "fetch");

    const response = await GET(
      new Request("https://lakat-iloilo.test/api/wikimedia-photo?path=%2Fetc%2Fpasswd"),
    );

    expect(response.status).toBe(404);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("serves cached image bytes without forwarding Wikimedia cookies", async () => {
    const imageBytes = new Uint8Array([0xff, 0xd8, 0xff]);
    const fetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(imageBytes, {
        headers: {
          "Content-Type": "image/jpeg",
          "Set-Cookie": "WMF-Uniq=private; Domain=.wikimedia.org",
        },
      }),
    );
    const path = "/wikipedia/commons/thumb/a/a6/Bucari_Pine_Forest.jpg/500px-Bucari_Pine_Forest.jpg";

    const response = await GET(
      new Request(`https://lakat-iloilo.test/api/wikimedia-photo?path=${encodeURIComponent(path)}`),
    );

    expect(fetch).toHaveBeenCalledWith(
      `https://thumb.wikimedia.org${path}`,
      expect.objectContaining({ redirect: "error" }),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(response.headers.get("cache-control")).toContain("s-maxage=604800");
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(imageBytes);
  });
});
