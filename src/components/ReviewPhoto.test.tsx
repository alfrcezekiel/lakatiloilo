import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ReviewPhotos } from "./ReviewPhoto";

afterEach(() => vi.unstubAllEnvs());

describe("review photo previews", () => {
  it("uses an aspect-preserving preview and keeps the original for the zoom view", () => {
    // Resized previews are only asked for when image resizing is on (paid
    // Supabase plan, see canResize in src/lib/photo-url.ts).
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_IMAGE_RESIZE", "true");
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

// The viewer, like the place gallery's (team request 2026-11-28).
describe("review photo viewer", () => {
  const photos = [1, 2, 3].map((n) => ({
    id: `photo-${n}`,
    url: `https://storage.example.test/review-photos/traveler/${n}.jpg`,
  }));
  const shownPhoto = (container: HTMLElement) => container.querySelector("dialog img")?.getAttribute("src");

  it("shows Next only on the first photo, both arrows in the middle, Previous only on the last", () => {
    const { container } = render(<ReviewPhotos photos={photos} reviewerName="Lia" />);

    expect(screen.queryByRole("button", { name: "Previous photo", hidden: true })).toBeNull();
    const next = screen.getByRole("button", { name: "Next photo", hidden: true });
    expect(next).toHaveClass("fixed", "top-1/2", "right-2");
    expect(screen.getByText("1 of 3")).toBeInTheDocument();

    fireEvent.click(next);
    expect(shownPhoto(container)).toBe(photos[1].url);
    expect(screen.getByRole("button", { name: "Previous photo", hidden: true })).toHaveClass("left-2");
    expect(screen.getByText("2 of 3")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Next photo", hidden: true }));
    expect(shownPhoto(container)).toBe(photos[2].url);
    expect(screen.queryByRole("button", { name: "Next photo", hidden: true })).toBeNull();
  });

  it("follows the arrow keys, never past the last photo", () => {
    const { container } = render(<ReviewPhotos photos={photos} reviewerName="Lia" />);
    const dialog = container.querySelector("dialog")!;

    fireEvent.keyDown(dialog, { key: "ArrowRight" });
    fireEvent.keyDown(dialog, { key: "ArrowRight" });
    fireEvent.keyDown(dialog, { key: "ArrowRight" });
    expect(shownPhoto(container)).toBe(photos[2].url);

    fireEvent.keyDown(dialog, { key: "ArrowLeft" });
    expect(shownPhoto(container)).toBe(photos[1].url);
  });

  it("one photo: no arrows and no count", () => {
    render(<ReviewPhotos photos={photos.slice(0, 1)} reviewerName="Lia" />);

    expect(screen.queryByRole("button", { name: /photo$/i, hidden: true })).toBeNull();
    expect(screen.queryByText(/of 1/)).toBeNull();
  });

  it("has no credit line, unlike the place gallery", () => {
    const { container } = render(<ReviewPhotos photos={photos} reviewerName="Lia" />);
    const dialog = container.querySelector("dialog")!;

    expect(dialog.textContent).not.toMatch(/photo:|credit|public domain|cc0/i);
    expect(dialog.querySelector("a")).toBeNull();
  });
});
