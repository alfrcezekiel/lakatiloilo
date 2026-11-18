import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { loginToken } from "@/lib/login";
import { HelpfulButton } from "./HelpfulButton";
import { ME, SOMEONE_ELSE, review, traveler } from "../../test/fixtures/reviews";
import { backend, refusal } from "../../test/mocks/handlers";
import { server } from "../../test/mocks/server";

// The login is pretend: loginToken() answers a made-up token, never a real one.
vi.mock("@/lib/login", () => ({ loginToken: vi.fn() }));

const someoneElsesReview = review({ user_id: SOMEONE_ELSE, helpful_count: 3, liked_by_me: false });

describe("<HelpfulButton>", () => {
  beforeEach(() => {
    vi.mocked(loginToken).mockResolvedValue("pretend-token");
  });

  describe("when the traveler cannot mark it", () => {
    it("shows only the count, as text, to someone logged out", () => {
      render(<HelpfulButton item={someoneElsesReview} user={null} onChange={vi.fn()} />);

      expect(screen.getByText("3 travelers found this helpful")).toBeInTheDocument();
      expect(screen.queryByRole("button")).not.toBeInTheDocument();
    });

    it("shows only the count on the traveler's own review", () => {
      render(<HelpfulButton item={review({ user_id: ME, helpful_count: 1 })} user={traveler()} onChange={vi.fn()} />);

      expect(screen.getByText("1 traveler found this helpful")).toBeInTheDocument();
      expect(screen.queryByRole("button")).not.toBeInTheDocument();
    });

    it("says nobody has marked it yet instead of showing 0", () => {
      render(<HelpfulButton item={review({ helpful_count: 0 })} user={null} onChange={vi.fn()} />);
      expect(screen.getByText("No one has marked this helpful yet")).toBeInTheDocument();
    });
  });

  describe("on someone else's review, logged in", () => {
    it("is a toggle button that tells screen readers it is not marked yet", () => {
      render(<HelpfulButton item={someoneElsesReview} user={traveler()} onChange={vi.fn()} />);

      const button = screen.getByRole("button", { name: /Helpful · 3/ });
      expect(button).toHaveAttribute("aria-pressed", "false");
    });

    it("marks it Helpful with the traveler's login and shows the new count at once", async () => {
      let sentLogin: string | null = null;
      server.use(
        backend.post(`/v1/reviews/${someoneElsesReview.id}/like`, (request) => {
          sentLogin = request.headers.get("Authorization");
          return { helpful_count: 4, liked: true };
        }),
      );
      const onChange = vi.fn();
      render(<HelpfulButton item={someoneElsesReview} user={traveler()} onChange={onChange} />);

      await userEvent.setup().click(screen.getByRole("button", { name: /Helpful · 3/ }));

      await waitFor(() => expect(onChange).toHaveBeenCalledWith(4, true));
      expect(sentLogin).toBe("Bearer pretend-token");
    });

    it("un-marks it (DELETE) when the traveler had already marked it", async () => {
      const marked = review({ user_id: SOMEONE_ELSE, helpful_count: 4, liked_by_me: true });
      server.use(backend.delete(`/v1/reviews/${marked.id}/like`, () => ({ helpful_count: 3, liked: false })));
      const onChange = vi.fn();
      render(<HelpfulButton item={marked} user={traveler()} onChange={onChange} />);

      const button = screen.getByRole("button", { name: /Helpful · 4/ });
      expect(button).toHaveAttribute("aria-pressed", "true");
      await userEvent.setup().click(button);

      await waitFor(() => expect(onChange).toHaveBeenCalledWith(3, false));
    });

    it("uses the reply address for a reply", async () => {
      const replyItem = { id: "bbbbbbbb-0000-4000-8000-000000000002", user_id: SOMEONE_ELSE, helpful_count: 0 };
      server.use(backend.post(`/v1/replies/${replyItem.id}/like`, () => ({ helpful_count: 1, liked: true })));
      const onChange = vi.fn();
      render(<HelpfulButton item={replyItem} user={traveler()} onChange={onChange} kind="reply" small />);

      await userEvent.setup().click(screen.getByRole("button"));

      await waitFor(() => expect(onChange).toHaveBeenCalledWith(1, true));
    });

    it("cannot be clicked twice while the first click is being saved", async () => {
      let answer: (value: Response) => void = () => {};
      server.use(
        backend.post(`/v1/reviews/${someoneElsesReview.id}/like`, () => new Promise<Response>((done) => (answer = done))),
      );
      render(<HelpfulButton item={someoneElsesReview} user={traveler()} onChange={vi.fn()} />);
      const button = screen.getByRole("button");

      await userEvent.setup().click(button);

      await waitFor(() => expect(button).toBeDisabled());
      answer(Response.json({ helpful_count: 4, liked: true }));
      await waitFor(() => expect(button).toBeEnabled());
    });

    it("shows the backend's own sentence when it refuses", async () => {
      server.use(
        backend.post(`/v1/reviews/${someoneElsesReview.id}/like`, () =>
          refusal(404, "We couldn't find that review."),
        ),
      );
      const onChange = vi.fn();
      render(<HelpfulButton item={someoneElsesReview} user={traveler()} onChange={onChange} />);

      await userEvent.setup().click(screen.getByRole("button"));

      expect(await screen.findByRole("alert")).toHaveTextContent("We couldn't find that review.");
      expect(onChange).not.toHaveBeenCalled();
    });

    it("asks the traveler to log in again when the login has run out (and sends nothing)", async () => {
      vi.mocked(loginToken).mockResolvedValue(null);
      render(<HelpfulButton item={someoneElsesReview} user={traveler()} onChange={vi.fn()} />);

      await userEvent.setup().click(screen.getByRole("button"));

      expect(await screen.findByRole("alert")).toHaveTextContent("Please log in again, then try again.");
    });
  });
});
