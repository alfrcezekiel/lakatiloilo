import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PlacePhoto } from "./PlacePhoto";

// Lighthouse 2026-11-21 (phone): the place page's largest picture is the
// hero, and "LCP request discovery" asked for fetchpriority=high on it. The
// browser then downloads it before the other photos further down the page.
// Cards and thumbnails stay low priority and lazy, so they never compete.

const PHOTO = "https://upload.wikimedia.org/wikipedia/commons/a/ab/Molo_Church.jpg";

// The splash art is decoration (alt=""), so it has no role "img" to find
// by name; it is the only picture in what PlacePhoto renders.
const onlyPicture = (container: HTMLElement) => container.querySelector("img");

describe("<PlacePhoto>", () => {
  it("asks the browser to load the hero splash art first, and never lazily", () => {
    const { container } = render(<PlacePhoto src={null} alt="Molo Church" size="hero" />);

    expect(onlyPicture(container)).toHaveAttribute("fetchpriority", "high");
    expect(onlyPicture(container)).toHaveAttribute("loading", "eager");
  });

  it("asks the browser to load a place's own hero photo first", () => {
    render(<PlacePhoto src={PHOTO} alt="Molo Church" size="hero" />);

    expect(screen.getByRole("img", { name: "Molo Church" })).toHaveAttribute("fetchpriority", "high");
  });

  it("asks for a full-size hero photo first too", () => {
    render(<PlacePhoto src={PHOTO} alt="Molo Church" size="hero" fullSize />);

    expect(screen.getByRole("img", { name: "Molo Church" })).toHaveAttribute("fetchpriority", "high");
  });

  it("leaves card photos lazy and without a priority, so they never slow the hero", () => {
    render(<PlacePhoto src={PHOTO} alt="Simbahan ng Miag-ao" size="card" />);

    const card = screen.getByRole("img", { name: "Simbahan ng Miag-ao" });
    expect(card).toHaveAttribute("loading", "lazy");
    expect(card).not.toHaveAttribute("fetchpriority");
  });
});
