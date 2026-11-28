import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { Faq } from "@/lib/api";
import { FaqSection } from "./FaqSection";
import { Footer } from "./Footer";

// Ticket 170: the home page's FAQs accordion.
const FAQS: Faq[] = [
  { id: "a", question: "What is Lakat Iloilo?", answer: "A website.\n\nFor travelers.", topic: "about_platform" },
  { id: "b", question: "Is it free?", answer: "Yes.", topic: "about_platform" },
  { id: "c", question: "How do I find places?", answer: "Search.", topic: "finding_places" },
];

const question = (name: RegExp) => screen.getByRole("button", { name });
const chip = (name: RegExp) => within(screen.getByRole("group", { name: "Topics" })).getByRole("button", { name });

describe("FaqSection (ticket 170)", () => {
  it("shows every question closed, numbered, under its heading", () => {
    render(<FaqSection faqs={FAQS} loading={false} />);

    expect(screen.getByRole("heading", { name: "Frequently asked questions" })).toBeInTheDocument();
    const buttons = screen.getAllByRole("button", { expanded: false });
    expect(buttons.map((b) => b.textContent)).toEqual([
      "01What is Lakat Iloilo?",
      "02Is it free?",
      "03How do I find places?",
    ]);
    buttons.forEach((b) => expect(b).toHaveAttribute("aria-expanded", "false"));
    // A closed answer is inert: browsers skip it for Tab and screen
    // readers (jsdom does not, so the attribute itself is checked).
    expect(screen.getByRole("region", { name: /What is Lakat Iloilo/ })).toHaveAttribute("inert");
  });

  it("opens one answer at a time, with its paragraphs, and closes it again", async () => {
    render(<FaqSection faqs={FAQS} loading={false} />);
    const user = userEvent.setup();

    await user.click(question(/What is Lakat Iloilo/));
    expect(question(/What is Lakat Iloilo/)).toHaveAttribute("aria-expanded", "true");
    const answer = screen.getByRole("region", { name: /What is Lakat Iloilo/ });
    expect(answer).not.toHaveAttribute("inert");
    expect([...answer.querySelectorAll("p")].map((p) => p.textContent)).toEqual(["A website.", "For travelers."]);

    await user.click(question(/Is it free/));
    expect(question(/Is it free/)).toHaveAttribute("aria-expanded", "true");
    expect(question(/What is Lakat Iloilo/)).toHaveAttribute("aria-expanded", "false");

    await user.click(question(/Is it free/));
    expect(question(/Is it free/)).toHaveAttribute("aria-expanded", "false");
  });

  it("works with the keyboard: Enter and Space, Up and Down, Home and End", async () => {
    render(<FaqSection faqs={FAQS} loading={false} />);
    const user = userEvent.setup();

    // Past the 3 topic chips and the "See every question" link (ticket
    // 173) to the first question.
    for (let stop = 0; stop < 5; stop++) await user.tab();
    expect(question(/What is Lakat Iloilo/)).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(question(/What is Lakat Iloilo/)).toHaveAttribute("aria-expanded", "true");

    await user.keyboard("{ArrowDown}");
    expect(question(/Is it free/)).toHaveFocus();
    await user.keyboard(" ");
    expect(question(/Is it free/)).toHaveAttribute("aria-expanded", "true");

    await user.keyboard("{End}");
    expect(question(/How do I find places/)).toHaveFocus();
    await user.keyboard("{ArrowDown}");
    expect(question(/What is Lakat Iloilo/)).toHaveFocus();
    await user.keyboard("{ArrowUp}");
    expect(question(/How do I find places/)).toHaveFocus();
    await user.keyboard("{Home}");
    expect(question(/What is Lakat Iloilo/)).toHaveFocus();
  });

  it("shows the title and 4 skeleton cards while loading", () => {
    const { container } = render(<FaqSection faqs={[]} loading />);

    expect(screen.getByRole("heading", { name: "Frequently asked questions" })).toBeInTheDocument();
    expect(container.querySelectorAll('[aria-hidden="true"].motion-safe\\:animate-pulse')).toHaveLength(4);
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });

  it("is hidden when no question is shown", () => {
    const { container } = render(<FaqSection faqs={[]} loading={false} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("topic chips and the footer link (ticket 171)", () => {
  it("has a chip per topic with shown questions, each with its count", () => {
    render(<FaqSection faqs={FAQS} loading={false} />);

    const chips = within(screen.getByRole("group", { name: "Topics" })).getAllByRole("button");
    // No "New to Iloilo": none of its questions is shown.
    expect(chips.map((c) => c.textContent)).toEqual([
      "All, 3 questions",
      "About Lakat Iloilo, 2 questions",
      "Finding the right place, 1 question",
    ]);
    expect(chip(/^All/)).toHaveAttribute("aria-pressed", "true");
    // An odd number of chips: All spans the whole row on phones.
    expect(chip(/^All/)).toHaveClass("col-span-2");
  });

  it("shows only the chosen topic, numbered from 01, and All shows every one", async () => {
    render(<FaqSection faqs={FAQS} loading={false} />);
    const user = userEvent.setup();

    await user.click(chip(/^About Lakat Iloilo/));
    expect(chip(/^About Lakat Iloilo/)).toHaveAttribute("aria-pressed", "true");
    expect(chip(/^All/)).toHaveAttribute("aria-pressed", "false");
    expect(screen.getAllByRole("button", { expanded: false }).map((b) => b.textContent)).toEqual([
      "01What is Lakat Iloilo?",
      "02Is it free?",
    ]);
    expect(screen.getByRole("status")).toHaveTextContent("Showing 2 questions: About Lakat Iloilo");

    await user.click(chip(/^Finding the right place/));
    expect(screen.getAllByRole("button", { expanded: false }).map((b) => b.textContent)).toEqual([
      "01How do I find places?",
    ]);

    await user.click(chip(/^All/));
    expect(screen.getAllByRole("button", { expanded: false })).toHaveLength(3);
  });

  it("goes back to All when the chosen topic's last question is hidden", async () => {
    const { rerender } = render(<FaqSection faqs={FAQS} loading={false} />);
    const user = userEvent.setup();

    await user.click(chip(/^Finding the right place/));
    rerender(<FaqSection faqs={FAQS.filter((f) => f.topic !== "finding_places")} loading={false} />);

    expect(chip(/^All/)).toHaveAttribute("aria-pressed", "true");
    expect(screen.getAllByRole("button", { expanded: false })).toHaveLength(2);
  });

  it("has a FAQs link in the footer only when the section is there", () => {
    const { rerender } = render(<Footer hasFaqs />);
    expect(screen.getByRole("button", { name: "FAQs" })).toBeInTheDocument();

    rerender(<Footer />);
    expect(screen.queryByRole("button", { name: "FAQs" })).not.toBeInTheDocument();
  });
});

describe("Other topics and the FAQs page link (ticket 173)", () => {
  it("gives a typed topic its own chip after the built-in ones, and links to /faqs", () => {
    render(
      <FaqSection
        faqs={[...FAQS, { id: "d", question: "Where can I swim?", answer: "At the beach.", topic: "Beaches" }]}
        loading={false}
      />,
    );

    const chips = within(screen.getByRole("group", { name: "Topics" })).getAllByRole("button");
    expect(chips.map((c) => c.textContent?.split(",")[0])).toEqual(["All", "About Lakat Iloilo", "Finding the right place", "Beaches"]);
    expect(screen.getByRole("link", { name: "See every question by topic" })).toHaveAttribute("href", "/faqs");
  });
});

describe("All follows the chips' topic order (code review 2026-11-28)", () => {
  it("lists every question topic by topic, in the same order as the chips", () => {
    // In an order the backend could send for typed topics.
    render(
      <FaqSection
        faqs={[
          { id: "z", question: "Zebra question?", answer: "Z.", topic: "Zebra crossings" },
          { id: "b", question: "Beach question?", answer: "B.", topic: "beaches" },
          { id: "a", question: "Is it free?", answer: "Yes.", topic: "about_platform" },
        ]}
        loading={false}
      />,
    );

    const chips = within(screen.getByRole("group", { name: "Topics" })).getAllByRole("button");
    expect(chips.map((c) => c.textContent?.split(",")[0])).toEqual(["All", "About Lakat Iloilo", "beaches", "Zebra crossings"]);
    expect(screen.getAllByRole("button", { expanded: false }).map((b) => b.textContent)).toEqual([
      "01Is it free?",
      "02Beach question?",
      "03Zebra question?",
    ]);
  });
});
