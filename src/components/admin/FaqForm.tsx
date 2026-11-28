"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { GlassField, fieldInputClass } from "@/components/GlassField";
import { ADMIN_FAQS_KEY, errorMessage } from "@/components/admin/admin-ui";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import {
  addAdminFaq,
  backendField,
  backendMessage,
  FAQ_LIMITS,
  FAQ_SHOWN_LIMIT,
  updateAdminFaq,
  type AdminFaq,
  type FaqDraft,
} from "@/lib/api";
import {
  characters,
  checkFaq,
  draftOf,
  FAQ_TOPIC_NAME,
  OTHER_TOPIC,
  topicsOf,
  type FaqErrors,
  type FaqFields,
} from "@/lib/faqs";
import { freshToken } from "@/lib/login";
import { cn } from "@/lib/utils";

// The Add a question / Edit pop-up on /admin/faqs (FAQs round, ticket 169):
// Question, Answer, Topic and "Show on the home page", each with its own
// message when something is wrong, from the form or from the backend.
//
// It is the browser's own <dialog>, like the Delete pop-up: the page
// behind cannot be clicked, keyboard focus stays inside, Escape works like
// Cancel (not while saving), and closing puts the focus back on the button
// that opened it. A solid panel, no blur (the dashboard's rule).

const button =
  "inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-full border px-5 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-default disabled:opacity-60";

// A <select> inside a glass field, as on the place form.
const fieldSelectClass =
  "block w-full cursor-pointer bg-transparent py-0.5 text-base text-white focus:outline-none [&>option]:bg-teal-950 [&>option]:text-white";

const BOXES: (keyof FaqFields)[] = ["question", "answer", "topic", "other_topic", "is_shown"];

export function FaqFormDialog({
  open,
  faq,
  faqs,
  onClose,
  onSaved,
}: {
  open: boolean;
  // The question to edit, or null to add one.
  faq: AdminFaq | null;
  // Every question now (for the 12-shown check).
  faqs: AdminFaq[];
  onClose: () => void;
  // A sentence for the screen's status line.
  onSaved: (message: string) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) element.showModal();
    if (!open && element.open) element.close();
  }, [open]);

  const cancel = () => {
    if (!saving) onClose();
  };

  return (
    <dialog
      ref={dialog}
      aria-labelledby="faq-form-title"
      onCancel={(event) => {
        event.preventDefault();
        cancel();
      }}
      onClick={(event) => {
        if (event.target === dialog.current) cancel();
      }}
      className="m-auto max-h-[calc(100dvh-2rem)] w-[min(40rem,calc(100%-2rem))] overflow-y-auto rounded-2xl border border-white/25 bg-teal-950 p-5 text-left text-white backdrop:bg-black/60 sm:p-6"
    >
      {/* Mounted only while open, so each opening starts from the
          question's own words (or empty boxes). */}
      {open && (
        <FaqFormBody
          key={faq?.id ?? "new"}
          faq={faq}
          faqs={faqs}
          saving={saving}
          setSaving={setSaving}
          onCancel={cancel}
          onSaved={(message) => {
            onSaved(message);
            onClose();
          }}
        />
      )}
    </dialog>
  );
}

function FaqFormBody({
  faq,
  faqs,
  saving,
  setSaving,
  onCancel,
  onSaved,
}: {
  faq: AdminFaq | null;
  faqs: AdminFaq[];
  saving: boolean;
  setSaving: (saving: boolean) => void;
  onCancel: () => void;
  onSaved: (message: string) => void;
}) {
  const queryClient = useQueryClient();
  const id = useId();
  const [fields, setFields] = useState<FaqFields>(
    faq
      ? { question: faq.question, answer: faq.answer, topic: faq.topic, other_topic: "", is_shown: faq.is_shown }
      : { question: "", answer: "", topic: "", other_topic: "", is_shown: false },
  );
  const [errors, setErrors] = useState<FaqErrors>({});
  // A refusal that is not about one box (no login, the database is down).
  const [formError, setFormError] = useState<string | null>(null);

  const otherShown = faqs.filter((f) => f.is_shown && f.id !== faq?.id).length;

  const set = <K extends keyof FaqFields>(key: K, value: FaqFields[K]) => {
    setFields((now) => ({ ...now, [key]: value }));
    // The box's message goes as soon as it is changed.
    setErrors((now) => ({ ...now, [key]: undefined }));
    setFormError(null);
  };

  // "<id>-error" while the box has a message, else its hint.
  const describedBy = (key: keyof FaqFields) => `${id}-${key}-${errors[key] ? "error" : "hint"}`;

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    const found = checkFaq(fields, otherShown);
    setErrors(found);
    setFormError(null);
    const first = BOXES.find((box) => found[box]);
    if (first) {
      document.getElementById(`${id}-${first}`)?.focus();
      return;
    }

    const draft = draftOf(fields);
    // Edit sends only what changed.
    const changes: Partial<FaqDraft> = faq
      ? Object.fromEntries(
          (Object.keys(draft) as (keyof FaqDraft)[])
            .filter((key) => draft[key] !== faq[key])
            .map((key) => [key, draft[key]]),
        )
      : draft;
    if (faq && Object.keys(changes).length === 0) {
      onSaved(`No changes to "${faq.question}".`);
      return;
    }

    setSaving(true);
    try {
      const token = await freshToken();
      if (!token) throw new Error("Please log in again, then try again.");
      const saved = faq ? await updateAdminFaq(token, faq.id, changes) : await addAdminFaq(token, draft);
      queryClient.setQueryData<AdminFaq[]>(ADMIN_FAQS_KEY, (list) =>
        faq ? list?.map((f) => (f.id === saved.id ? saved : f)) : list && [...list, saved],
      );
      // Ask again too: moving to another topic renumbers its old one.
      void queryClient.invalidateQueries({ queryKey: ADMIN_FAQS_KEY });
      const where = saved.is_shown ? "It shows on the home page." : "It is hidden from the home page.";
      onSaved(faq ? `"${saved.question}" saved. ${where}` : `"${saved.question}" was added. ${where}`);
    } catch (e) {
      // The backend names the box it refused, so its message goes there.
      let field = backendField(e) as keyof FaqFields | null;
      // A refused topic typed under Other belongs under its own box.
      if (field === "topic" && fields.topic === OTHER_TOPIC) field = "other_topic";
      const message = backendMessage(e);
      if (field && BOXES.includes(field) && message) {
        setErrors({ [field]: message });
        document.getElementById(`${id}-${field}`)?.focus();
      } else {
        setFormError(errorMessage(e));
      }
    } finally {
      setSaving(false);
    }
  };

  // The Topic list: the built-in topics, then every topic typed before
  // (ticket 173), then Other.
  const topics = topicsOf(faqs, true);
  const otherLength = characters(fields.other_topic.trim());
  const questionLength = characters(fields.question.trim());
  const answerLength = characters(fields.answer.trim());

  return (
    <form
      onSubmit={(event) => void save(event)}
      noValidate
      aria-busy={saving}
      className="space-y-4"
    >
      <h2 id="faq-form-title" className="font-fraunces text-xl font-medium">
        {faq ? "Edit question" : "Add a question"}
      </h2>

      <GlassField
        id={`${id}-question`}
        label="Question"
        hint={`${questionLength} of ${FAQ_LIMITS.question} characters`}
        error={errors.question}
      >
        <Input
          id={`${id}-question`}
          autoFocus
          value={fields.question}
          onChange={(e) => set("question", e.target.value)}
          maxLength={FAQ_LIMITS.question + 50}
          autoComplete="off"
          aria-invalid={!!errors.question}
          aria-describedby={describedBy("question")}
          className={fieldInputClass}
        />
      </GlassField>

      <GlassField
        id={`${id}-answer`}
        label="Answer"
        hint={`Leave an empty line between paragraphs. ${answerLength} of ${FAQ_LIMITS.answer} characters`}
        error={errors.answer}
      >
        {/* Grows with the text, as the place form's description. */}
        <Textarea
          id={`${id}-answer`}
          value={fields.answer}
          onChange={(e) => set("answer", e.target.value)}
          rows={5}
          aria-invalid={!!errors.answer}
          aria-describedby={describedBy("answer")}
          className={cn(fieldInputClass, "field-sizing-content max-h-[50dvh] min-h-28 resize-y")}
        />
      </GlassField>

      <GlassField
        id={`${id}-topic`}
        label="Topic"
        hint={faq ? "Moving it to another topic puts it at the end of that topic." : "It goes at the end of its topic."}
        error={errors.topic}
      >
        <select
          id={`${id}-topic`}
          value={fields.topic}
          onChange={(e) => set("topic", e.target.value as FaqFields["topic"])}
          aria-invalid={!!errors.topic}
          aria-describedby={describedBy("topic")}
          className={fieldSelectClass}
        >
          <option value="" disabled>
            Choose a topic
          </option>
          {topics.map((topic) => (
            <option key={topic.id} value={topic.id}>
              {topic.name}
            </option>
          ))}
          <option value={OTHER_TOPIC}>Other…</option>
        </select>
      </GlassField>

      {/* Other (ticket 173): the new topic's name, right under the list. */}
      {fields.topic === OTHER_TOPIC && (
        <GlassField
          id={`${id}-other_topic`}
          label="New topic"
          hint={`For example "Beaches" or "Festivals". ${otherLength} of ${FAQ_TOPIC_NAME.max} characters`}
          error={errors.other_topic}
        >
          <Input
            id={`${id}-other_topic`}
            autoFocus
            value={fields.other_topic}
            onChange={(e) => set("other_topic", e.target.value)}
            maxLength={FAQ_TOPIC_NAME.max + 20}
            autoComplete="off"
            aria-invalid={!!errors.other_topic}
            aria-describedby={describedBy("other_topic")}
            className={fieldInputClass}
          />
        </GlassField>
      )}

      <div>
        <label
          htmlFor={`${id}-is_shown`}
          className={cn(
            "flex min-h-11 cursor-pointer items-center gap-3 rounded-2xl border bg-white/5 px-4 py-2.5 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-white",
            errors.is_shown ? "border-amber-300/80" : "border-white/45 hover:border-white/70",
          )}
        >
          <input
            id={`${id}-is_shown`}
            type="checkbox"
            checked={fields.is_shown}
            onChange={(e) => set("is_shown", e.target.checked)}
            aria-invalid={!!errors.is_shown}
            aria-describedby={describedBy("is_shown")}
            className="size-5 shrink-0 cursor-pointer accent-amber-300"
          />
          <span className="font-semibold">Show on the home page</span>
        </label>
        {errors.is_shown ? (
          <p id={`${id}-is_shown-error`} role="alert" className="mt-1 px-1 text-sm text-amber-200">
            {errors.is_shown}
          </p>
        ) : (
          <p id={`${id}-is_shown-hint`} className="mt-1 px-1 text-xs text-white/70">
            {otherShown} other {otherShown === 1 ? "question is" : "questions are"} shown; up to {FAQ_SHOWN_LIMIT} can be.
          </p>
        )}
      </div>

      {formError && (
        <p role="alert" className="text-sm font-medium text-amber-200">
          {formError}
        </p>
      )}

      <div className="grid grid-cols-2 gap-2 sm:flex sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className={cn(button, "border-white/40 hover:border-amber-300 hover:text-amber-300")}
        >
          Cancel
        </button>
        <button type="submit" disabled={saving} className={cn(button, "border-white bg-white text-teal-900 hover:bg-white/90")}>
          {saving ? <Spinner /> : <Check aria-hidden="true" className="size-4" />}
          {saving ? "Saving…" : faq ? "Save" : "Add question"}
        </button>
      </div>
    </form>
  );
}
