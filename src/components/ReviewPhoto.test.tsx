import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ReviewPhotos } from "./ReviewPhoto";

afterEach(() => vi.unstubAllEnvs());

describe("review photo previews", () => {
  it("uses an aspect-preserving preview and keeps the original for the zoom view", () => {
    // Resized previews are only asked for on the production site (paid
    // Supabase plan, see canResize in src/lib/photo-url.ts).
    vi.stubEnv("NEXT_PUBLIC_APP_ENV", "production");
    const original =
      "https://example.supabase.co/storage/v1/object/public/review-photos/traveler/photo.jpg";

    const { container } = render(
      <ReviewPhotos photos={[{ id: "photo-1", url: original }]} reviewerName="Lia" />,
    );

    const button = screen.getByRole("button", { name: "Photo from Lia's review, open larger" });
    const image = button.querySelector("img");
    const preview = new URL(image?.src ?? "");
    expect(preview.pathname).toContain("/storage/v1/render/image/public/review-photos/");
    expect(preview.searchParams.get("width")).toBe("224");
    expect(preview.searchParams.get("height")).toBe("224");
    expect(preview.searchParams.get("resize")).toBe("contain");
    expect(button).toHaveClass("size-28");
    expect(image).toHaveClass("size-full", "object-contain");
    expect(image).not.toHaveClass("object-cover");
    expect(container.querySelector("dialog img")).toHaveAttribute("src", original);
  });
});
