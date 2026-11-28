import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { AdminFaq } from "@/lib/api";
import { freshToken } from "@/lib/login";
import { AdminFaqList } from "./AdminFaqs";
import { API } from "../../../test/mocks/handlers";
import { server } from "../../../test/mocks/server";

// Ticket 169: Add a question and Edit on /admin/faqs, against a pretend
// backend. The login is pretend too: freshToken() answers a made-up token.
vi.mock("@/lib/login", () => ({ freshToken: vi.fn(), readLogin: vi.fn(() => null) }));

// jsdom has no <dialog> pop-up of its own: open and close just set "open".
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
  };
});
beforeEach(() => vi.mocked(freshToken).mockResolvedValue("pretend-token"));

const faq = (over: Partial<AdminFaq>): AdminFaq => ({
  id: "q1",
  question: "Is it free?",
  answer: "Yes.",
  topic: "about_platform",
  position: 1,
  is_shown: false,
  updated_at: "2026-11-28T10:00:00Z",
  ...over,
});

const show = (faqs: AdminFaq[]) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <AdminFaqList faqs={faqs} />
    </QueryClientProvider>,
  );

describe("FAQ form (ticket 169)", () => {
  it("adds a question with every box, and says what happened", async () => {
    let sent: unknown;
    server.use(
      http.post(`${API}/v1/admin/faqs`, async ({ request }) => {
        sent = await request.json();
        expect(request.headers.get("authorization")).toBe("Bearer pretend-token");
        return HttpResponse.json(faq({ id: "new", question: "Do I need an account?", is_shown: true, position: 2 }), { status: 201 });
      }),
    );
    show([faq({})]);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Add a question" }));
    const form = screen.getByRole("dialog", { name: "Add a question" });
    await user.type(within(form).getByLabelText("Question"), "Do I need an account?");
    expect(within(form).getByText("21 of 150 characters")).toBeInTheDocument();
    await user.type(within(form).getByLabelText("Answer"), "No.");
    await user.selectOptions(within(form).getByLabelText("Topic"), "about_platform");
    await user.click(within(form).getByLabelText("Show on the home page"));
    await user.click(within(form).getByRole("button", { name: "Add question" }));

    expect(await screen.findByRole("status")).toHaveTextContent(
      '"Do I need an account?" was added. It shows on the home page.',
    );
    expect(sent).toEqual({ question: "Do I need an account?", answer: "No.", topic: "about_platform", is_shown: true });
  });

  it("shows each empty box's message without asking the backend", async () => {
    show([]);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Add a question" }));
    await user.click(screen.getByRole("button", { name: "Add question" }));

    expect(screen.getByText("Please write the question.")).toBeInTheDocument();
    expect(screen.getByText("Please write the answer.")).toBeInTheDocument();
    expect(screen.getByText("Please choose a topic.")).toBeInTheDocument();
    // The first wrong box gets the focus.
    expect(screen.getByLabelText("Question")).toHaveFocus();
  });

  it("refuses showing a 13th question in the form", async () => {
    const twelve = Array.from({ length: 12 }, (_, i) => faq({ id: `s${i}`, question: `Shown ${i}?`, position: i + 1, is_shown: true }));
    show([...twelve, faq({ id: "hidden", question: "Hidden one?", position: 13 })]);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: 'Edit "Hidden one?"' }));
    await user.click(screen.getByLabelText("Show on the home page"));
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(screen.getByText("Only 12 questions can show at once. Hide one first.")).toBeInTheDocument();
  });

  it("edits only what changed, and puts the backend's message under its box", async () => {
    const sent: unknown[] = [];
    server.use(
      http.patch(`${API}/v1/admin/faqs/q1`, async ({ request }) => {
        sent.push(await request.json());
        return HttpResponse.json(
          { statusCode: 400, field: "answer", code: "answer_too_long", message: "Please keep the answer to 1000 characters." },
          { status: 400 },
        );
      }),
    );
    show([faq({})]);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: 'Edit "Is it free?"' }));
    const answer = screen.getByLabelText("Answer");
    expect(answer).toHaveValue("Yes.");
    await user.type(answer, " Always.");
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(screen.getByText("Please keep the answer to 1000 characters.")).toBeInTheDocument());
    expect(sent).toEqual([{ answer: "Yes. Always." }]);
    expect(answer).toHaveAttribute("aria-invalid", "true");
  });

  it("shows a New topic box under Other, checks it, and sends the typed topic (ticket 173)", async () => {
    let sent: unknown;
    server.use(
      http.post(`${API}/v1/admin/faqs`, async ({ request }) => {
        sent = await request.json();
        return HttpResponse.json(faq({ id: "n", question: "Where can I swim?", topic: "Beaches" }), { status: 201 });
      }),
    );
    show([faq({ topic: "Festivals" })]);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Add a question" }));
    const form = screen.getByRole("dialog", { name: "Add a question" });
    // A topic typed before is in the list, after the built-in ones.
    expect(within(form).getAllByRole("option").map((o) => o.textContent)).toEqual([
      "Choose a topic",
      "New to Iloilo",
      "About Lakat Iloilo",
      "Finding the right place",
      "Festivals",
      "Other…",
    ]);
    expect(within(form).queryByLabelText("New topic")).not.toBeInTheDocument();

    await user.type(within(form).getByLabelText("Question"), "Where can I swim?");
    await user.type(within(form).getByLabelText("Answer"), "At the beach.");
    await user.selectOptions(within(form).getByLabelText("Topic"), "Other…");
    const box = within(form).getByLabelText("New topic");
    await user.click(within(form).getByRole("button", { name: "Add question" }));
    expect(within(form).getByText("Please write the new topic.")).toBeInTheDocument();

    await user.type(box, "Beaches");
    expect(within(form).getByText(/7 of 40 characters/)).toBeInTheDocument();
    await user.click(within(form).getByRole("button", { name: "Add question" }));

    await waitFor(() => expect(sent).toEqual({ question: "Where can I swim?", answer: "At the beach.", topic: "Beaches", is_shown: false }));
  });
});
