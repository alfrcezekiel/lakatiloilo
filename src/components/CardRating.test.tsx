import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { PlaceRating } from "@/lib/api";
import { CardRating, ratingKey } from "./CardRating";
import { PLACE_ID } from "../../test/fixtures/reviews";

const ratings = (...list: PlaceRating[]) => new Map(list.map((r) => [ratingKey(r.place_type, r.place_id), r]));

describe("<CardRating>", () => {
  it("shows nothing when the ratings could not be loaded (never a wrong \"No reviews yet\")", () => {
    const { container } = render(<CardRating ratings={null} placeType="destination" placeId={PLACE_ID} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows "No reviews yet" for a place nobody reviewed', () => {
    render(<CardRating ratings={ratings()} placeType="destination" placeId={PLACE_ID} />);
    expect(screen.getByText("No reviews yet")).toBeInTheDocument();
  });

  it("shows the average with one decimal and the number of reviews", () => {
    render(
      <CardRating
        ratings={ratings({ place_type: "destination", place_id: PLACE_ID, average_rating: 4.33, review_count: 12 })}
        placeType="destination"
        placeId={PLACE_ID}
      />,
    );

    expect(screen.getByText("4.3")).toBeInTheDocument();
    expect(screen.getByText("· 12 reviews")).toBeInTheDocument();
  });

  it("reads a full sentence to screen readers", () => {
    render(
      <CardRating
        ratings={ratings({ place_type: "destination", place_id: PLACE_ID, average_rating: 5, review_count: 1 })}
        placeType="destination"
        placeId={PLACE_ID}
      />,
    );

    expect(screen.getByText("Rated 5.0 out of 5 from 1 review")).toHaveClass("sr-only");
  });

  it("does not mix up a destination and an accommodation with the same id", () => {
    render(
      <CardRating
        ratings={ratings({ place_type: "accommodation", place_id: PLACE_ID, average_rating: 3, review_count: 2 })}
        placeType="destination"
        placeId={PLACE_ID}
      />,
    );

    expect(screen.getByText("No reviews yet")).toBeInTheDocument();
  });
});
