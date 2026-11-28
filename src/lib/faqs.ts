import { FAQ_LIMITS, FAQ_SHOWN_LIMIT, type FaqDraft, type FaqTopic } from "@/lib/api";

// The three built-in topics, in the order the site shows them, with their
// names (FAQs round, ticket 168).
export const FAQ_TOPICS: { id: FaqTopic; name: string }[] = [
  { id: "new_to_iloilo", name: "New to Iloilo" },
  { id: "about_platform", name: "About Lakat Iloilo" },
  { id: "finding_places", name: "Finding the right place" },
];

// A custom topic's length (ticket 173; the backend and database check it).
export const FAQ_TOPIC_NAME = { min: 2, max: 40 };

// Every topic in these questions, in the site's order: the three built-in
// ones first, then the ones typed under Other, A to Z (ticket 173).
// `alwaysBuiltIn` keeps the built-in ones even with no question (the
// admin list says "No questions in this topic yet").
export function topicsOf(faqs: { topic: FaqTopic }[], alwaysBuiltIn = false): { id: FaqTopic; name: string }[] {
  const used = new Set(faqs.map((faq) => faq.topic));
  const builtIn = FAQ_TOPICS.filter((topic) => alwaysBuiltIn || used.has(topic.id));
  const custom = [...used]
    .filter((topic) => !FAQ_TOPICS.some((t) => t.id === topic))
    .sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base" }) || a.localeCompare(b))
    .map((topic) => ({ id: topic, name: topic }));
  return [...builtIn, ...custom];
}

// The Topic list's last choice, which shows the "New topic" box.
export const OTHER_TOPIC = "__other";

// The FAQ form's boxes (ticket 169), as typed. `topic` is a topic's id,
// "" before one is chosen, or OTHER_TOPIC with the name in `other_topic`.
export type FaqFields = { question: string; answer: string; topic: FaqTopic | ""; other_topic: string; is_shown: boolean };
export type FaqErrors = Partial<Record<keyof FaqFields, string>>;

export const SHOWN_LIMIT_MESSAGE = "Only 12 questions can show at once. Hide one first.";

// Characters as the database counts them, so an emoji is 1 (the counter
// and the checks use this, like the backend).
export const characters = (text: string) => [...text].length;

// The same cleaning as the backend: the question is one line; the answer
// keeps its paragraphs, without spaces at line ends or extra empty lines.
// Invisible control characters (code review 2026-11-28): a pasted text can
// carry them, and the database refuses them (a NUL anywhere, any of them
// in a topic). They are taken out of every box; tabs and line breaks are
// kept for the steps below.
const HIDDEN_CHARACTERS = /[\u0000-\u0008\u000e-\u001f\u007f-\u009f]/g;
export const cleanQuestion = (text: string) => text.replace(HIDDEN_CHARACTERS, "").replace(/\s+/g, " ").trim();
export const cleanAnswer = (text: string) =>
  text
    .replace(HIDDEN_CHARACTERS, "")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

// The same checks and words as the backend, one message per box.
// `otherShown` is how many OTHER questions are shown now.
export function checkFaq(fields: FaqFields, otherShown: number): FaqErrors {
  const errors: FaqErrors = {};
  const question = cleanQuestion(fields.question);
  const answer = cleanAnswer(fields.answer);
  if (!question) errors.question = "Please write the question.";
  else if (characters(question) > FAQ_LIMITS.question)
    errors.question = `Please keep the question to ${FAQ_LIMITS.question} characters.`;
  if (!answer) errors.answer = "Please write the answer.";
  else if (characters(answer) > FAQ_LIMITS.answer)
    errors.answer = `Please keep the answer to ${FAQ_LIMITS.answer} characters.`;
  if (!fields.topic) errors.topic = "Please choose a topic.";
  else if (fields.topic === OTHER_TOPIC) {
    const name = cleanQuestion(fields.other_topic);
    if (!name) errors.other_topic = "Please write the new topic.";
    else if (characters(name) < FAQ_TOPIC_NAME.min || characters(name) > FAQ_TOPIC_NAME.max)
      errors.other_topic = `Please write a topic of ${FAQ_TOPIC_NAME.min} to ${FAQ_TOPIC_NAME.max} characters.`;
  }
  if (fields.is_shown && otherShown >= FAQ_SHOWN_LIMIT) errors.is_shown = SHOWN_LIMIT_MESSAGE;
  return errors;
}

// What to send once the checks pass: everything for Add.
export const draftOf = (fields: FaqFields): FaqDraft => ({
  question: cleanQuestion(fields.question),
  answer: cleanAnswer(fields.answer),
  // Under Other, the typed name (one line, like the question).
  topic: fields.topic === OTHER_TOPIC ? cleanQuestion(fields.other_topic) : fields.topic,
  is_shown: fields.is_shown,
});
