import { render, screen, waitFor } from "@testing-library/react";
import userEvent, { PointerEventsCheckLevel } from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { loginToken } from "@/lib/login";
import { ReviewForm } from "./ReviewForm";
import { PLACE_ID, ME, review } from "../../test/fixtures/reviews";
import { backend, refusal } from "../../test/mocks/handlers";
import { server } from "../../test/mocks/server";

// The login is pretend: loginToken() answers a made-up token, never a real one.
vi.mock("@/lib/login", () => ({ loginToken: vi.fn() }));

// Draws the form and starts a pretend traveler (userEvent.setup) who
// clicks, types and pastes like a real person.
//
// Speed (measured 2026-11-17, one whole "post a review" test: 58 ms → 31 ms):
// - skipHover: before each click, user-event moves the pretend mouse over
//   the element first. On a star that runs the form's onMouseEnter, which
//   redraws all five stars (the hover preview), and again on leaving. No
//   test here checks that preview, so the extra redraws are skipped.
// - pointerEventsCheck Never: user-event checks the CSS for
//   "pointer-events: none" before clicking. The tests load no CSS
//   (css: false in vitest.config.mts), so that check can never find
//   anything and only costs time.
// - getByRole works out every element's accessible name and visibility
//   (about 5 ms per search here). So the text box and Post button are found
//   once and reused, stars are found by their label (the same
//   "5 stars, Excellent" a screen reader reads) and messages by their text,
//   each checked to be role="alert". The first test still uses getByRole
//   to check the stars are radio buttons and Post is a submit button.
const renderForm = (onSaved = vi.fn()) => {
  const user = userEvent.setup({ skipHover: true, pointerEventsCheck: PointerEventsCheckLevel.Never });
  render(<ReviewForm placeType="destination" placeId={PLACE_ID} onSaved={onSaved} />);
  const textBox = screen.getByLabelText("Your review");
  const postButton = screen.getByText("Post review").closest("button")!;
  return {
    user,
    onSaved,
    // The label also holds a hidden ★, so match "5 stars," as a whole word.
    stars: (n: number) => screen.getByLabelText(new RegExp(`\\b${n} stars?,`)),
    text: () => textBox,
    post: () => postButton,
  };
};

// A message the form shows, announced to screen readers (role="alert").
const expectAlert = (element: HTMLElement) => expect(element).toHaveAttribute("role", "alert");

describe("<ReviewForm> writing a new review", () => {
  beforeEach(() => {
    vi.mocked(loginToken).mockResolvedValue("pretend-token");
  });

  describe("before anything is sent", () => {
    it("offers five stars as radio buttons with words, so keyboards and screen readers can use them", () => {
      renderForm();

      expect(screen.getAllByRole("radio")).toHaveLength(5);
      expect(screen.getByRole("radio", { name: "1 star, Poor" })).toBeInTheDocument();
      expect(screen.getByRole("radio", { name: "5 stars, Excellent" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Post review" })).toHaveAttribute("type", "submit");
    });

    it("asks for stars and words when both are missing, and sends nothing", async () => {
      const form = renderForm();

      await form.user.click(form.post());

      expectAlert(screen.getByText("Please pick 1 to 5 stars."));
      expectAlert(screen.getByText("Please write a few words about your visit."));
      expect(form.onSaved).not.toHaveBeenCalled();
    });

    it("counts characters as the traveler types, ñ and accents as one each", async () => {
      const form = renderForm();

      await form.user.type(form.text(), "Niño");

      expect(screen.getByText("4 / 500")).toBeInTheDocument();
      expect(form.text()).toHaveAttribute("aria-describedby", `review-${PLACE_ID}-count`);
    });

    it("refuses more than 500 characters with a clear message", async () => {
      const form = renderForm();
      await form.user.click(form.stars(4));
      await form.user.click(form.text());
      await form.user.paste("a".repeat(501));

      await form.user.click(form.post());

      expect(screen.getByText("501 / 500")).toBeInTheDocument();
      expectAlert(screen.getByText("Please keep your review to 500 characters or fewer."));
      expect(form.text()).toHaveAttribute("aria-invalid", "true");
    });

    it("does not count spaces at the start and end", async () => {
      const form = renderForm();

      await form.user.type(form.text(), "   Ganda!   ");

      expect(screen.getByText("6 / 500")).toBeInTheDocument();
    });
  });

  describe("sending it", () => {
    it("posts the stars and trimmed words with the traveler's login, then hands back the saved review", async () => {
      let sent: { body: unknown; login: string | null } | null = null;
      const saved = review({ user_id: ME, rating: 5, comment: "Ang ganda sa Guimaras!" });
      server.use(
        backend.post("/v1/reviews", async (request) => {
          sent = { body: await request.json(), login: request.headers.get("Authorization") };
          return Response.json(saved, { status: 201 });
        }),
      );
      const form = renderForm();

      await form.user.click(form.stars(5));
      await form.user.click(form.text());
      await form.user.paste("  Ang ganda sa Guimaras!  ");
      await form.user.click(form.post());

      await waitFor(() => expect(form.onSaved).toHaveBeenCalled());
      expect(sent).toEqual({
        body: { place_type: "destination", place_id: PLACE_ID, rating: 5, comment: "Ang ganda sa Guimaras!" },
        login: "Bearer pretend-token",
      });
      expect(form.onSaved).toHaveBeenCalledWith(expect.objectContaining({ id: saved.id, rating: 5 }));
    });

    it('shows "Posting…" and cannot be sent twice while it is being saved', async () => {
      let answer: (value: Response) => void = () => {};
      server.use(backend.post("/v1/reviews", () => new Promise<Response>((done) => (answer = done))));
      const form = renderForm();
      await form.user.click(form.stars(3));
      await form.user.click(form.text());
      await form.user.paste("Okay lang.");

      await form.user.click(form.post());

      await waitFor(() => expect(form.post()).toBeDisabled());
      expect(form.post()).toHaveTextContent("Posting…");
      answer(Response.json(review({ user_id: ME }), { status: 201 }));
      await waitFor(() => expect(form.onSaved).toHaveBeenCalledTimes(1));
    });

    it("shows the backend's own sentence when it refuses, and keeps what was typed", async () => {
      server.use(backend.post("/v1/reviews", () => refusal(409, "You've already reviewed this place.")));
      const form = renderForm();
      await form.user.click(form.stars(5));
      await form.user.click(form.text());
      await form.user.paste("Second try");

      await form.user.click(form.post());

      expectAlert(await screen.findByText("You've already reviewed this place."));
      expect(form.text()).toHaveValue("Second try");
      expect(form.onSaved).not.toHaveBeenCalled();
    });

    it("falls back to a friendly sentence when the backend cannot be reached", async () => {
      server.use(backend.post("/v1/reviews", () => Response.error()));
      const form = renderForm();
      await form.user.click(form.stars(2));
      await form.user.click(form.text());
      await form.user.paste("Hmm");

      await form.user.click(form.post());

      expectAlert(await screen.findByText("Something went wrong. Please try again."));
    });

    it("asks the traveler to log in again when the login has run out (and sends nothing)", async () => {
      vi.mocked(loginToken).mockResolvedValue(null);
      const form = renderForm();
      await form.user.click(form.stars(5));
      await form.user.click(form.text());
      await form.user.paste("Nami gid!");

      await form.user.click(form.post());

      expectAlert(await screen.findByText("Please log in again, then try again."));
      expect(form.onSaved).not.toHaveBeenCalled();
    });
  });
});
