import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StorageCard } from "./AdminOverview";

const MB = 1024 * 1024;
const GB = 1024 * MB;
const storage = (used: number) => ({
  used_bytes: used,
  limit_bytes: GB,
  place_photos_bytes: 40 * MB,
  review_photos_bytes: 22 * MB,
  review_videos_bytes: Math.max(0, used - 62 * MB),
});

describe("StorageCard (ticket 167)", () => {
  it('says "312 MB of 1 GB used", with a meter screen readers can read, and what uses it', () => {
    render(<StorageCard storage={storage(312 * MB)} />);

    // The whole line as read: the big number and its smaller "of 1 GB used".
    expect(screen.getByText((_, el) => el?.tagName === "P" && el.textContent === "312 MB of 1 GB used")).toBeInTheDocument();
    const meter = screen.getByRole("meter", { name: "Storage used" });
    expect(meter).toHaveAttribute("aria-valuenow", "30");
    expect(meter).toHaveAttribute("aria-valuetext", "312 MB of 1 GB used, 30 %");
    expect(screen.getByRole("list", { name: "What uses it" })).toHaveTextContent("Review videos 250 MB");
    expect(screen.queryByText(/Nearly full/)).not.toBeInTheDocument();
  });

  it('says "Nearly full" in words from 80 %, not only with the amber colour', () => {
    render(<StorageCard storage={storage(0.85 * GB)} />);

    expect(screen.getByRole("status")).toHaveTextContent("Nearly full (85 %)");
  });

  it("says plainly when it is full and uploads will fail", () => {
    render(<StorageCard storage={storage(GB)} />);

    expect(screen.getByRole("status")).toHaveTextContent("Full: new photos and videos can't be uploaded.");
  });

  it("says so when storage can't be read, without breaking the Overview", () => {
    render(<StorageCard storage={null} />);

    expect(screen.getByText("Storage used can't be read right now. Please try again later.")).toBeInTheDocument();
  });
});
