import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { ReviewVideo, ReviewVideoPicker } from "./ReviewVideo";
import { scrollIntoView } from "../../test/mocks/intersection-observer";

const SAVED = "https://storage.example.test/review-videos/u/v.mp4";

// The picker as the review form uses it, with its own state.
function Picker({ savedUrl }: { savedUrl: string | null }) {
  const [file, setFile] = useState<File | null>(null);
  const [remove, setRemove] = useState(false);
  return (
    <ReviewVideoPicker
      file={file}
      onFileChange={setFile}
      savedUrl={savedUrl}
      removeSaved={remove}
      onRemoveSavedChange={setRemove}
    />
  );
}

describe("ReviewVideoPicker (ticket 166)", () => {
  it("offers Add a video when the review has none", () => {
    render(<Picker savedUrl={null} />);

    expect(screen.getByText("Add a video")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /remove video/i })).not.toBeInTheDocument();
  });

  it("shows the saved video with Replace video and Remove video", () => {
    render(<Picker savedUrl={SAVED} />);

    act(() => scrollIntoView());
    expect(screen.getByLabelText("Your review's video")).toHaveAttribute("src", `${SAVED}#t=0.1`);
    expect(screen.getByText("Replace video")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /remove video/i })).toBeInTheDocument();
  });

  it("marks the video for removal until saved, and Keep the video undoes it", async () => {
    const user = userEvent.setup();
    render(<Picker savedUrl={SAVED} />);

    await user.click(screen.getByRole("button", { name: /remove video/i }));

    expect(screen.getByRole("status")).toHaveTextContent("The video will be removed when you save.");
    expect(screen.queryByLabelText("Your review's video")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Keep the video" }));

    expect(screen.getByLabelText("Your review's video")).toBeInTheDocument();
  });
});

describe("ReviewVideo", () => {
  it("loads nothing while it is far from the screen", () => {
    render(<ReviewVideo url={SAVED} reviewerName="Lia" />);

    const video = screen.getByLabelText("Video from Lia's review") as HTMLVideoElement;
    expect(video).not.toHaveAttribute("src");
    expect(video).toHaveAttribute("preload", "none");
  });

  it("near the screen, loads only its first frame as the thumbnail, and never plays by itself", () => {
    render(<ReviewVideo url={SAVED} reviewerName="Lia" />);

    act(() => scrollIntoView());

    const video = screen.getByLabelText("Video from Lia's review") as HTMLVideoElement;
    expect(video).toHaveAttribute("src", `${SAVED}#t=0.1`);
    expect(video).toHaveAttribute("preload", "metadata");
    expect(video.autoplay).toBe(false);
    expect(video).toHaveAttribute("controls");
  });

  it("shows nothing when the review has no video", () => {
    const { container } = render(<ReviewVideo url={null} reviewerName="Lia" />);

    expect(container).toBeEmptyDOMElement();
  });
});
