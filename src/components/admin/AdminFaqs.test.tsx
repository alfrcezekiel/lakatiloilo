import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render as renderPlain, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { AdminFaq } from "@/lib/api";
import { AdminFaqList } from "./AdminFaqs";

// The list asks the cache (moves, ticket 172), so it needs a QueryClient.
const render = (ui: React.ReactElement) =>
  renderPlain(<QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>);

// Ticket 168: the FAQs screen's list.
const faq = (over: Partial<AdminFaq>): AdminFaq => ({
  id: over.question ?? "q",
  question: "A question?",
  answer: "An answer.",
  topic: "about_platform",
  position: 1,
  is_shown: false,
  updated_at: "2026-11-28T10:00:00Z",
  ...over,
});

describe("AdminFaqList (ticket 168)", () => {
  it("groups the questions by topic, in order, with Shown or Hidden and the counter", () => {
    render(
      <AdminFaqList
        faqs={[
          faq({ question: "When is a good time to visit?", topic: "new_to_iloilo", position: 1, is_shown: true }),
          faq({ question: "What is Lakat Iloilo?", topic: "about_platform", position: 1 }),
          faq({ question: "Is it free?", topic: "about_platform", position: 2, is_shown: true }),
        ]}
      />,
    );

    expect(screen.getByText("2 of 12 shown")).toBeInTheDocument();
    expect(screen.getByText(/6 to 12 questions works best/)).toBeInTheDocument();

    const about = screen.getByRole("region", { name: "About Lakat Iloilo (2)" });
    const rows = within(about).getAllByRole("listitem");
    expect(rows.map((r) => r.textContent)).toEqual([
      expect.stringContaining("What is Lakat Iloilo?Hidden"),
      expect.stringContaining("Is it free?Shown"),
    ]);
    expect(screen.getByRole("region", { name: "New to Iloilo (1)" })).toHaveTextContent("Shown");
  });

  it("says so when a topic has no questions", () => {
    render(<AdminFaqList faqs={[]} />);
    expect(screen.getByText("0 of 12 shown")).toBeInTheDocument();
    expect(screen.getAllByText("No questions in this topic yet.")).toHaveLength(3);
  });
});
