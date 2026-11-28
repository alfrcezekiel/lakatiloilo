import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { Faq } from "@/lib/api";
import { useTableChanges } from "@/lib/realtime";
import { FaqsPage } from "./FaqsPage";
import { bringIntoView } from "../../test/mocks/intersection-observer";

// Ticket 173: the FAQs page (/faqs). Next.js's router and the Realtime
// doorbell are pretend here.
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/lib/realtime", () => ({ useTableChanges: vi.fn() }));

const FAQS: Faq[] = [
  { id: "a", question: "Is it free?", answer: "Yes.", topic: "about_platform" },
  { id: "b", question: "When is a good time to visit?", answer: "December to May.", topic: "new_to_iloilo" },
  { id: "c", question: "Where can I swim?", answer: "At the beach.", topic: "Beaches" },
  { id: "d", question: "Do I need an account?", answer: "No.", topic: "about_platform" },
];

describe("FaqsPage (ticket 173)", () => {
  it("shows every question under its topic, built-in topics first, with a link per topic", () => {
    render(<FaqsPage faqs={FAQS} failed={false} />);

    expect(screen.getByRole("heading", { level: 1, name: "Frequently asked questions" })).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent)).toEqual([
      "New to Iloilo",
      "About Lakat Iloilo",
      "Beaches",
      "Ready to explore Iloilo?",
    ]);
    // How many answers and topics, and each topic's own count.
    expect(screen.getByText("4 answers · 3 topics")).toBeInTheDocument();
    expect(within(screen.getByRole("region", { name: "About Lakat Iloilo" })).getByText("2 questions")).toBeInTheDocument();
    const about = screen.getByRole("region", { name: "About Lakat Iloilo" });
    expect(within(about).getAllByRole("button").map((b) => b.textContent)).toEqual(["01Is it free?", "02Do I need an account?"]);

    const links = within(screen.getByRole("navigation", { name: "Topics" })).getAllByRole("link");
    expect(links.map((l) => [l.textContent, l.getAttribute("href")])).toEqual([
      ["New to Iloilo, 1 question", "#faq-topic-0"],
      ["About Lakat Iloilo, 2 questions", "#faq-topic-1"],
      ["Beaches, 1 question", "#faq-topic-2"],
    ]);
    // Back to Home only at the top; the closing card leads to the
    // destinations (team request 2026-11-28).
    expect(screen.getAllByRole("link", { name: "Back to Home" }).map((l) => l.getAttribute("href"))).toEqual(["/"]);
    expect(screen.getByRole("link", { name: "Explore destinations" })).toHaveAttribute("href", "/#explore-categories");
  });

  it("marks the first topic as the one being read, and only one", () => {
    render(<FaqsPage faqs={FAQS} failed={false} />);

    const links = within(screen.getByRole("navigation", { name: "Topics" })).getAllByRole("link");
    expect(links.map((l) => l.getAttribute("aria-current"))).toEqual(["true", null, null]);
  });

  it("moves the mark to the topic the traveler scrolls to", () => {
    render(<FaqsPage faqs={FAQS} failed={false} />);

    act(() => bringIntoView(screen.getByRole("region", { name: "Beaches" })));

    const links = within(screen.getByRole("navigation", { name: "Topics" })).getAllByRole("link");
    expect(links.map((l) => l.getAttribute("aria-current"))).toEqual([null, null, "true"]);
  });

  it("opens an answer, like the home page", async () => {
    render(<FaqsPage faqs={FAQS} failed={false} />);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: /Where can I swim/ }));

    expect(screen.getByRole("button", { name: /Where can I swim/ })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("region", { name: /Where can I swim/ })).toHaveTextContent("At the beach.");
  });

  it("listens to the FAQs doorbell only, so it updates live", () => {
    render(<FaqsPage faqs={FAQS} failed={false} />);
    expect(vi.mocked(useTableChanges)).toHaveBeenCalledWith(["faq_signals"], expect.any(Function));
  });

  it("says so when the questions could not be loaded, or there are none", () => {
    const { rerender } = render(<FaqsPage faqs={[]} failed />);
    expect(screen.getByRole("alert")).toHaveTextContent("We couldn't load the questions right now.");

    rerender(<FaqsPage faqs={[]} failed={false} />);
    expect(screen.getByText(/There are no questions here yet/)).toBeInTheDocument();
  });
});
