import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CategoryList } from "./CategoryList";

// Mountains & Hiking Spots shows every place; the other sections show up
// to 6 (team request 2026-11-28).
const places = (category: string, count: number) =>
  Array.from({ length: count }, (_, i) => ({
    id: `${category}-${i}`,
    name: `${category} place ${i + 1}`,
    description: "A place.",
    address: "Iloilo",
    photo_url: null,
    category,
  }));

const cardsIn = (title: string) => {
  const section = screen.getByRole("heading", { name: title }).closest("section")!;
  return section.querySelectorAll("a").length;
};

describe("CategoryList", () => {
  it("shows every mountain and hiking spot, not only the first 6", () => {
    render(
      <CategoryList destinations={places("mountain", 9)} category="mountain" title="Mountains" ratings={null} loading={false} />,
    );
    expect(cardsIn("Mountains")).toBe(9);
    expect(screen.getByText("mountain place 9")).toBeInTheDocument();
  });

  it("still shows up to 6 places in the other sections", () => {
    render(<CategoryList destinations={places("food", 9)} category="food" title="Food" ratings={null} loading={false} />);
    expect(cardsIn("Food")).toBe(6);
    expect(screen.queryByText("food place 7")).not.toBeInTheDocument();
  });
});
