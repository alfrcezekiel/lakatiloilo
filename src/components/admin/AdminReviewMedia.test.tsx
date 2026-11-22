import { act, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AdminReviewMedia, VideoTag } from "./AdminReviewMedia";
import { scrollIntoView } from "../../../test/mocks/intersection-observer";

const VIDEO = "https://storage.example.test/review-videos/u/v.mp4";
const PHOTO = { id: "p1", url: "https://storage.example.test/review-photos/u/p.webp", position: 1 };

// Bug fix (team report 2026-11-22): on /admin/reviews and /admin/reports a
// review's video only showed when the review also had photos.
describe("AdminReviewMedia", () => {
  it("shows the video of a review that has a video and no photos", () => {
    render(<AdminReviewMedia photos={[]} videoUrl={VIDEO} reviewerName="Kyle" />);
    act(() => scrollIntoView());

    expect(screen.getByLabelText("Video from Kyle's review")).toHaveAttribute("src", `${VIDEO}#t=0.1`);
  });

  it("shows both photos and the video when a review has both", () => {
    render(<AdminReviewMedia photos={[PHOTO]} videoUrl={VIDEO} reviewerName="Kyle" />);

    expect(screen.getByRole("list", { name: "Photos from Kyle's review" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /open larger/ })).toBeInTheDocument();
    expect(screen.getByLabelText("Video from Kyle's review")).toBeInTheDocument();
  });

  it("shows nothing for a review with neither", () => {
    const { container } = render(<AdminReviewMedia photos={[]} videoUrl={null} reviewerName="Kyle" />);

    expect(container).toBeEmptyDOMElement();
  });
});

describe("VideoTag", () => {
  it('says "Video" when the review has one, and nothing otherwise', () => {
    const { rerender } = render(<VideoTag videoUrl={VIDEO} />);
    expect(screen.getByText("Video")).toBeInTheDocument();

    rerender(<VideoTag videoUrl={null} />);
    expect(screen.queryByText("Video")).not.toBeInTheDocument();
  });
});
