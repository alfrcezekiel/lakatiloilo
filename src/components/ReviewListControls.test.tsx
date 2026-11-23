import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ReviewSortChips, ShowMoreReviews } from "./ReviewListControls";

describe("ReviewSortChips (ticket 162)", () => {
  it("shows the three chips in order, as a named group of buttons", () => {
    render(<ReviewSortChips active="relevant" onChoose={() => {}} />);

    const group = screen.getByRole("group", { name: "Sort reviews" });

    expect(within(group).getAllByRole("button").map((chip) => chip.textContent)).toEqual([
      "Most relevant",
      "With photos & videos",
      "Newest",
    ]);
  });

  it("tells a screen reader which chip is chosen, and only that one", () => {
    render(<ReviewSortChips active="media" onChoose={() => {}} />);

    expect(screen.getByRole("button", { name: "With photos & videos" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Most relevant" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "Newest" })).toHaveAttribute("aria-pressed", "false");
  });

  it("chooses a chip with a click", async () => {
    const user = userEvent.setup();
    const onChoose = vi.fn();
    render(<ReviewSortChips active="relevant" onChoose={onChoose} />);

    await user.click(screen.getByRole("button", { name: "Newest" }));

    expect(onChoose).toHaveBeenCalledExactlyOnceWith("newest");
  });

  it("chooses a chip with the keyboard alone", async () => {
    const user = userEvent.setup();
    const onChoose = vi.fn();
    render(<ReviewSortChips active="relevant" onChoose={onChoose} />);

    await user.tab();
    await user.tab();
    await user.keyboard("{Enter}");

    expect(onChoose).toHaveBeenCalledExactlyOnceWith("media");
  });
});

describe("ShowMoreReviews (ticket 163)", () => {
  it('says "Showing 3 of 10" and describes the button with it', () => {
    render(<ShowMoreReviews shown={3} total={10} onMore={() => {}} />);

    expect(screen.getByText("Showing 3 of 10")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Show more reviews" })).toHaveAccessibleDescription("Showing 3 of 10");
  });

  it("asks for more when pressed", async () => {
    const user = userEvent.setup();
    const onMore = vi.fn();
    render(<ShowMoreReviews shown={3} total={4} onMore={onMore} />);

    await user.click(screen.getByRole("button", { name: "Show more reviews" }));

    expect(onMore).toHaveBeenCalledOnce();
  });

  it.each([
    ["every review is shown", 10, 10],
    ["there are fewer reviews than the first 3", 3, 2],
    ["there are no reviews", 3, 0],
  ])("shows nothing when %s", (_case, shown, total) => {
    const { container } = render(<ShowMoreReviews shown={shown} total={total} onMore={() => {}} />);

    expect(container).toBeEmptyDOMElement();
  });
});
