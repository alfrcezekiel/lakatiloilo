import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { photoSrcSet, photoThumb, reviewPhotoThumb } from "./photo-url";

// Resized Supabase copies only exist on the production site's paid plan
// (canResize in photo-url.ts), so most tests pretend to be production.
beforeEach(() => vi.stubEnv("NEXT_PUBLIC_APP_ENV", "production"));
afterEach(() => vi.unstubAllEnvs());

const WIKI =
  "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a6/Bucari_Pine_Forest.jpg/1280px-Bucari_Pine_Forest.jpg";
const SUPA =
  "https://fyqdsebfijhaqnwwgopt.supabase.co/storage/v1/object/public/place-photos/destination/abc/photo.jpg";
const wikimediaPath = (url: string) =>
  new URL(url, "https://lakat-iloilo.test").searchParams.get("path");

describe("photoThumb", () => {
  it("asks Wikimedia for the nearest allowed width", () => {
    expect(wikimediaPath(photoThumb(WIKI, 384))).toContain("/500px-Bucari_Pine_Forest.jpg");
    expect(wikimediaPath(photoThumb(WIKI, 800))).toContain("/960px-Bucari_Pine_Forest.jpg");
    expect(wikimediaPath(photoThumb(WIKI, 1280))).toContain("/1280px-Bucari_Pine_Forest.jpg");
  });

  it("requests a high-quality WebP display copy for place uploads", () => {
    const thumb = new URL(photoThumb(SUPA, 800));
    expect(thumb.pathname).toContain("/storage/v1/render/image/public/place-photos/");
    expect(thumb.searchParams.get("width")).toBe("800");
    expect(thumb.searchParams.get("quality")).toBe("85");
    expect(thumb.searchParams.get("format")).toBe("webp");

    const set = photoSrcSet(SUPA, [512, 800]);
    expect(set).toContain("512w");
    expect(set).toContain("800w");
    expect(set).toContain("width=512");
    expect(set).toContain("width=800");
  });

  it("leaves other addresses alone", () => {
    const unsplash = "https://images.unsplash.com/photo-123?w=960&h=2400";
    expect(photoThumb(unsplash, 300)).toBe(unsplash);
    expect(photoThumb("/splash-desktop-1920x1080.webp", 300)).toBe(
      "/splash-desktop-1920x1080.webp",
    );
  });

  it("leaves a Wikimedia file page (not a thumbnail) alone", () => {
    const page = "https://commons.wikimedia.org/wiki/File:Bucari.jpg";
    expect(photoThumb(page, 300)).toBe(page);
  });
});
describe("photoSrcSet", () => {
  it("lists each size with the width it really serves", () => {
    const set = photoSrcSet(WIKI, [512, 800]);
    expect(set).toContain("500w");
    expect(set).toContain("960w");
    expect(set).toContain(encodeURIComponent("/500px-Bucari_Pine_Forest.jpg"));
    expect(set).toContain(encodeURIComponent("/960px-Bucari_Pine_Forest.jpg"));
  });

  it("drops duplicate widths after snapping", () => {
    const set = photoSrcSet(WIKI, [400, 600]);
    expect(set).toBe(`${photoThumb(WIKI, 400)} 500w`);
  });

  it("is undefined when the address cannot be resized", () => {
    expect(photoSrcSet("https://images.unsplash.com/photo-123", [300])).toBeUndefined();
  });
});

describe("Supabase photos off the production site", () => {
  const REVIEW =
    "https://ezcgvqfasuhsllbijqfm.supabase.co/storage/v1/object/public/review-photos/user/photo.webp";

  it("asks production's Supabase for a small review thumbnail", () => {
    const thumb = new URL(reviewPhotoThumb(REVIEW));

    expect(thumb.pathname).toContain("/storage/v1/render/image/public/review-photos/");
    expect(thumb.searchParams.get("width")).toBe("224");
  });

  it("uses the original review photo on staging, where resizing answers 403", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_ENV", "staging");

    expect(reviewPhotoThumb(REVIEW)).toBe(REVIEW);
  });

  it("uses the original place photo on staging and in development", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_ENV", "staging");
    const onStaging = photoThumb(SUPA, 800);
    vi.stubEnv("NEXT_PUBLIC_APP_ENV", "development");
    const inDevelopment = photoSrcSet(SUPA, [512, 800]);

    expect(onStaging).toBe(SUPA);
    expect(inDevelopment).toBeUndefined();
  });
});
