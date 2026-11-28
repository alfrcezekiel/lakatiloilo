import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { AdminFaq } from "@/lib/api";
import { freshToken } from "@/lib/login";
import { AdminFaqList } from "./AdminFaqs";
import { PendingDeletesHost } from "./PendingDeletes";
import { API } from "../../../test/mocks/handlers";
import { server } from "../../../test/mocks/server";

// Ticket 172: Move up / Move down and Delete with Undo on /admin/faqs,
// against a pretend backend and a pretend login.
vi.mock("@/lib/login", () => ({ freshToken: vi.fn(), readLogin: vi.fn(() => null) }));

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
  };
});
beforeEach(() => vi.mocked(freshToken).mockResolvedValue("pretend-token"));

const faq = (id: string, question: string, position: number): AdminFaq => ({
  id,
  question,
  answer: "An answer.",
  topic: "about_platform",
  position,
  is_shown: false,
  updated_at: "2026-11-28T10:00:00Z",
});
const FAQS = [faq("a", "First?", 1), faq("b", "Second?", 2), faq("c", "Third?", 3)];

// The list reads the cache, as on the real page, so a move shows at once.
function show(faqs: AdminFaq[]) {
  const client = new QueryClient();
  client.setQueryData(["admin", "faqs"], faqs);
  function Page() {
    const data = client.getQueryData<AdminFaq[]>(["admin", "faqs"]) ?? [];
    return <AdminFaqList faqs={data} />;
  }
  const view = render(
    <QueryClientProvider client={client}>
      <Page />
      <PendingDeletesHost />
    </QueryClientProvider>,
  );
  client.getQueryCache().subscribe(() =>
    view.rerender(
      <QueryClientProvider client={client}>
        <Page />
        <PendingDeletesHost />
      </QueryClientProvider>,
    ),
  );
  return view;
}

const rows = () =>
  within(screen.getByRole("region", { name: /About Lakat Iloilo/ }))
    .getAllByRole("listitem")
    .map((li) => li.querySelector("p")?.textContent);

describe("Move up and Move down (ticket 172)", () => {
  it("has no Move up on the first and no Move down on the last", () => {
    show(FAQS);

    expect(screen.queryByRole("button", { name: 'Move up: "First?"' })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: 'Move down: "First?"' })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: 'Move up: "Third?"' })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: 'Move down: "Third?"' })).not.toBeInTheDocument();
  });

  it("gives a question alone in its topic no arrows at all", () => {
    show([faq("a", "Only one?", 1)]);
    expect(screen.queryByRole("button", { name: /^Move/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: 'Edit "Only one?"' })).toBeInTheDocument();
  });

  it("sends the direction and shows the new order the backend answers", async () => {
    let sent: unknown;
    server.use(
      http.post(`${API}/v1/admin/faqs/b/move`, async ({ request }) => {
        sent = await request.json();
        return HttpResponse.json([faq("b", "Second?", 1), faq("a", "First?", 2), faq("c", "Third?", 3)]);
      }),
    );
    show(FAQS);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: 'Move up: "Second?"' }));

    await waitFor(() => expect(rows()).toEqual(["01Second?", "02First?", "03Third?"]));
    expect(sent).toEqual({ direction: "up" });
    expect(screen.getByText('"Second?" moved up.')).toBeInTheDocument();
  });

  it("shows the backend's refusal", async () => {
    server.use(
      http.post(`${API}/v1/admin/faqs/b/move`, () =>
        HttpResponse.json({ statusCode: 400, message: "It is already the first in its topic." }, { status: 400 }),
      ),
    );
    show(FAQS);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: 'Move up: "Second?"' }));
    expect(await screen.findByRole("alert")).toHaveTextContent("It is already the first in its topic.");
  });
});

describe("Delete with Undo (ticket 172)", () => {
  it("asks first, takes the question off the list, and Undo brings it back without asking the backend", async () => {
    // No DELETE handler: a request would fail the test (onUnhandledRequest).
    show(FAQS);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: 'Delete "Second?"' }));
    const dialog = screen.getByRole("dialog", { name: 'Delete "Second?"?' });
    expect(dialog).toHaveTextContent("it does not go to the Trash");
    await user.click(within(dialog).getByRole("button", { name: "Yes, delete" }));

    await waitFor(() => expect(rows()).toEqual(["01First?", "02Third?"]));
    expect(screen.getByText(/"Second\?" deleted\./)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^Undo/ }));
    expect(rows()).toEqual(["01First?", "02Second?", "03Third?"]);
  });

  it("Cancel keeps the question", async () => {
    show(FAQS);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: 'Delete "Third?"' }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Cancel" }));

    expect(rows()).toHaveLength(3);
  });

  it("keeps counting a waiting question as shown, and pauses its topic's arrows until the Undo is over", async () => {
    show([faq("a", "First?", 1), { ...faq("b", "Second?", 2), is_shown: true }, faq("c", "Third?", 3)]);
    const user = userEvent.setup();
    expect(screen.getByText("1 of 12 shown")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: 'Delete "Second?"' }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Yes, delete" }));

    // Still in the database for 8 seconds: still counted, and said so.
    await waitFor(() => expect(rows()).toEqual(["01First?", "02Third?"]));
    expect(screen.getByText("1 of 12 shown")).toBeInTheDocument();
    expect(screen.getByText("1 of them is waiting to be deleted (Undo).")).toBeInTheDocument();
    expect(screen.getByText("Move up and Move down wait until the Undo is over.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: 'Move up: "Third?"' })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: /^Undo/ }));
    expect(screen.getByRole("button", { name: 'Move up: "Third?"' })).toBeEnabled();
    expect(screen.queryByText(/waiting to be deleted/)).not.toBeInTheDocument();
  });
});
