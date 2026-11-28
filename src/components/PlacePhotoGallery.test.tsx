import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { PublicPlacePhoto } from "@/lib/api";
import { PlacePhotoGallery } from "./PlacePhotoGallery";

// The gallery uses the shared PhotoViewer since the code review of
// 2026-11-28; it keeps its credit line, which review photos do not have.
const photos: PublicPlacePhoto[] = [
  { id: "p1", url: "https://storage.example.test/place-photos/1.jpg", credit_line: "Photo: Ana, CC BY 4.0", licence: "cc_by_4", source_url: "https://example.test/original-1" },
  { id: "p2", url: "https://storage.example.test/place-photos/2.jpg", credit_line: "Photo: Ben, public domain (CC0)", licence: "cc0", source_url: "" },
];

describe("place photo gallery viewer", () => {
  it("shows the photo's credit line under the count, a link when there is an original", () => {
    const { container } = render(<PlacePhotoGallery photos={photos} placeName="Garin Farm" />);
    const dialog = container.querySelector("dialog")!;

    expect(dialog).toHaveAttribute("aria-label", "Photos of Garin Farm");
    expect(screen.getByText("1 of 2")).toBeInTheDocument();
    expect(dialog.querySelector("a")).toHaveAttribute("href", "https://example.test/original-1");

    fireEvent.click(screen.getByRole("button", { name: "Next photo", hidden: true }));
    expect(screen.getByText("2 of 2")).toBeInTheDocument();
    expect(dialog.textContent).toContain("Photo: Ben, public domain (CC0)");
    expect(dialog.querySelector("a")).toBeNull();
    expect(screen.queryByRole("button", { name: "Next photo", hidden: true })).toBeNull();
    expect(screen.getByRole("button", { name: "Previous photo", hidden: true })).toHaveClass("fixed", "top-1/2");
  });
});
