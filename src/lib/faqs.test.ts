import { describe, expect, it } from "vitest";
import { checkFaq, cleanAnswer, draftOf, OTHER_TOPIC, topicsOf, type FaqFields } from "./faqs";

// Ticket 169: the FAQ form's own checks, the same words as the backend's.
const good: FaqFields = { question: "Is it free?", answer: "Yes.", topic: "about_platform", other_topic: "", is_shown: false };

describe("checkFaq (ticket 169)", () => {
  it("passes a good question", () => {
    expect(checkFaq(good, 0)).toEqual({});
  });

  it("gives each box its own message", () => {
    expect(checkFaq({ question: "  ", answer: "", topic: "", other_topic: "", is_shown: false }, 0)).toEqual({
      question: "Please write the question.",
      answer: "Please write the answer.",
      topic: "Please choose a topic.",
    });
    expect(checkFaq({ ...good, question: "q".repeat(151), answer: "a".repeat(1001) }, 0)).toEqual({
      question: "Please keep the question to 150 characters.",
      answer: "Please keep the answer to 1000 characters.",
    });
  });

  it("counts an emoji as one character, like the database", () => {
    expect(checkFaq({ ...good, question: "🌴".repeat(150) }, 0)).toEqual({});
  });

  it("refuses a 13th shown question, but not one that is hidden", () => {
    expect(checkFaq({ ...good, is_shown: true }, 12)).toEqual({
      is_shown: "Only 12 questions can show at once. Hide one first.",
    });
    expect(checkFaq({ ...good, is_shown: true }, 11)).toEqual({});
    expect(checkFaq(good, 12)).toEqual({});
  });
});

describe("cleaning (ticket 169)", () => {
  it("keeps the answer's paragraphs and makes the question one line", () => {
    expect(cleanAnswer("One.  \r\n\r\n\r\n\r\nTwo. ")).toBe("One.\n\nTwo.");
    expect(draftOf({ ...good, question: " Is \n it  free? " }).question).toBe("Is it free?");
  });
});

describe("Other topics (ticket 173)", () => {
  it("needs a new topic of 2 to 40 characters under Other, and sends its name", () => {
    expect(checkFaq({ ...good, topic: OTHER_TOPIC, other_topic: " " }, 0)).toEqual({ other_topic: "Please write the new topic." });
    expect(checkFaq({ ...good, topic: OTHER_TOPIC, other_topic: "B" }, 0)).toEqual({
      other_topic: "Please write a topic of 2 to 40 characters.",
    });
    expect(draftOf({ ...good, topic: OTHER_TOPIC, other_topic: "  Beaches  and  islands " }).topic).toBe("Beaches and islands");
  });

  it("lists the built-in topics first, then the typed ones A to Z", () => {
    const faqs = [{ topic: "Zebra" }, { topic: "about_platform" }, { topic: "beaches" }, { topic: "Zebra" }];
    expect(topicsOf(faqs).map((t) => t.name)).toEqual(["About Lakat Iloilo", "beaches", "Zebra"]);
    expect(topicsOf(faqs, true).map((t) => t.id)).toEqual(["new_to_iloilo", "about_platform", "finding_places", "beaches", "Zebra"]);
  });
});

describe("hidden characters (code review 2026-11-28)", () => {
  it("takes invisible control characters out, like the backend", () => {
    const draft = draftOf({ ...good, question: "Is\u0000 it free?", answer: "Ye\u0007s.\n\nOK.", topic: OTHER_TOPIC, other_topic: "Beach\u0001es" });
    expect(draft).toMatchObject({ question: "Is it free?", answer: "Yes.\n\nOK.", topic: "Beaches" });
  });
});
