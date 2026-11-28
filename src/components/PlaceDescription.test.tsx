import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PlaceDescription, descriptionParagraphs } from "./PlaceDescription";

describe("descriptionParagraphs", () => {
  it("splits on an empty line", () => {
    expect(descriptionParagraphs("First part.\n\nSecond part.")).toEqual(["First part.", "Second part."]);
  });

  it("keeps a single line break inside a paragraph", () => {
    expect(descriptionParagraphs("Open daily\n8 AM to 9 PM")).toEqual(["Open daily\n8 AM to 9 PM"]);
  });

  it("ignores extra empty lines, spaces on empty lines and Windows line endings", () => {
    expect(descriptionParagraphs("\n\nOne.\r\n  \r\n\r\n\r\nTwo.  \n\n")).toEqual(["One.", "Two."]);
  });

  it("treats a line of only spaces or tabs as an empty line, with no gap left behind", () => {
    expect(descriptionParagraphs("A\n\n \nB")).toEqual(["A", "B"]);
    expect(descriptionParagraphs("A\n \t \nB\n  C")).toEqual(["A", "B\nC"]);
  });

  it("gives one paragraph for text with no line breaks", () => {
    expect(descriptionParagraphs("Just one paragraph.")).toEqual(["Just one paragraph."]);
  });
});

describe("PlaceDescription", () => {
  it("shows each paragraph as its own <p>", () => {
    const { container } = render(<PlaceDescription description={"Seafood by the sea.\n\nOpen for groups."} />);

    expect(container.querySelectorAll("p")).toHaveLength(2);
    expect(screen.getByText("Open for groups.")).toBeInTheDocument();
  });

  it("shows typed HTML as plain text, never as a tag", () => {
    const { container } = render(<PlaceDescription description={'<a href="https://bad.example">Win</a>'} />);

    expect(container.querySelector("a")).toBeNull();
    expect(screen.getByText('<a href="https://bad.example">Win</a>')).toBeInTheDocument();
  });
});
