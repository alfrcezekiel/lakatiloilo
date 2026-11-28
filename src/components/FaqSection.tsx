"use client";

import { ArrowRight, ChevronDown } from "lucide-react";
import Link from "next/link";
import { useId, useMemo, useRef, useState } from "react";
import { descriptionParagraphs } from "@/components/PlaceDescription";
import { Reveal } from "@/components/Reveal";
import { Skeleton } from "@/components/ui/skeleton";
import type { Faq, FaqTopic } from "@/lib/api";
import { topicsOf } from "@/lib/faqs";
import { cn } from "@/lib/utils";

// The home page's "Frequently asked questions" (FAQs round, ticket 170):
// the questions the Lakat Iloilo team ticked to show on /admin/faqs, as
// an accordion.
//   - Each question is a glass card with a number badge ("01") and a
//     chevron. Clicking it opens its answer, which slides open, and
//     closes the one that was open. Clicking the open one closes it.
//   - The open card gets an amber accent line and a brighter border.
//   - Glass without blur: the section sits on the plain teal background,
//     where blur only adds light bands (frontend rules). Hover brightens
//     the border, never a white tint.
//   - Keyboard and screen readers: each question is a real button that
//     says whether it is open (aria-expanded). Tab, Enter and Space work
//     as for any button; Up and Down move between questions, Home and End
//     go to the first and last. A closed answer is "inert": it cannot be
//     reached or read until it opens.
//   - With "reduce motion" on, answers appear without sliding.
//   - While loading: the title and 4 skeleton cards. With no shown
//     question the section is hidden.
// Layout (ticket 171): on a laptop two columns. The left one stays in
// place while the traveler scrolls (sticky): the heading, one short line
// and the topic chips (All, New to Iloilo, About Lakat Iloilo, Finding the
// right place, each with a count). The right one is the accordion. On
// phones the columns stack and the chips sit in a grid of equal columns,
// so they never wrap into uneven rows. A topic with no shown questions has
// no chip.
// It has no background of its own: it sits inside the home page's last
// teal-to-emerald section, with the place lists (team request 2026-11-28).
// Answers keep the team's paragraphs, like a place's About, and are shown
// as text, never as HTML.

const SKELETON_CARDS = 4;

type Chip = { id: FaqTopic | "all"; name: string; count: number };

export function FaqSection({ faqs, loading }: { faqs: Faq[]; loading: boolean }) {
  // The chosen chip. If its topic loses its last question (the team hid
  // it), the section falls back to All.
  const [chosen, setChosen] = useState<Chip["id"]>("all");

  const chips = useMemo<Chip[]>(() => {
    // The built-in topics, then the ones typed under Other (ticket 173);
    // only topics with a shown question.
    const topics = topicsOf(faqs).map((topic) => ({
      ...topic,
      count: faqs.filter((faq) => faq.topic === topic.id).length,
    }));
    return [{ id: "all", name: "All", count: faqs.length }, ...topics];
  }, [faqs]);

  const topic = chips.some((chip) => chip.id === chosen) ? chosen : "all";
  // All: topic by topic in the chips' order (code review 2026-11-28: the
  // backend's A-to-Z for typed topics can differ from the browser's), each
  // topic's questions in the team's order.
  const shown = useMemo(
    () =>
      topic === "all"
        ? chips.slice(1).flatMap((chip) => faqs.filter((faq) => faq.topic === chip.id))
        : faqs.filter((faq) => faq.topic === topic),
    [chips, faqs, topic],
  );

  if (!loading && faqs.length === 0) return null;

  return (
    <section id="faq" aria-labelledby="faq-title" className="scroll-mt-20 py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:grid lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] lg:gap-12">
        {/* The left column, sticky on a laptop (top-24 clears the navbar). */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <Reveal>
            <h2 id="faq-title" className="text-3xl font-semibold text-white">
              Frequently asked questions
            </h2>
            <p className="mt-2 text-white/80">New to Iloilo or to Lakat Iloilo? Start here.</p>
          </Reveal>
          {!loading && (
            <>
              <TopicChips chips={chips} chosen={topic} onChoose={setChosen} />
              {/* The FAQs page, every question under its topic (ticket 173). */}
              <Link
                href="/faqs"
                className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-white/85 underline-offset-4 hover:text-amber-300 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                See every question by topic
                <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
            </>
          )}
        </div>

        <div className="mt-8 lg:mt-0">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: SKELETON_CARDS }, (_, index) => (
                <Skeleton key={index} className="h-16 rounded-2xl bg-white/15" />
              ))}
            </div>
          ) : (
            <>
              {/* Screen readers hear what a chip changed. */}
              <p role="status" className="sr-only">
                {topic === "all"
                  ? `Showing all ${shown.length} questions`
                  : `Showing ${shown.length} ${shown.length === 1 ? "question" : "questions"}: ${chips.find((c) => c.id === topic)?.name}`}
              </p>
              {/* A new key per topic, so the list starts closed again. */}
              <FaqAccordion key={topic} faqs={shown} />
            </>
          )}
        </div>
      </div>
    </section>
  );
}

// The topic chips: real toggle buttons (aria-pressed), always in a grid
// of equal columns, so no row is uneven (frontend rules):
//   - phones: 2 columns, with All across both when the count is odd;
//   - tablets: up to 4 chips sit in one row, one column each; with more
//     (topics typed under Other, code review 2026-11-28) they keep the
//     phone's 2 columns;
//   - laptop: a list down the left column.
const TABLET_COLUMNS: Record<number, string> = { 2: "md:grid-cols-2", 3: "md:grid-cols-3", 4: "md:grid-cols-4" };
function TopicChips({
  chips,
  chosen,
  onChoose,
}: {
  chips: Chip[];
  chosen: Chip["id"];
  onChoose: (id: Chip["id"]) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Topics"
      className={cn("mt-6 grid grid-cols-2 gap-2 lg:grid-cols-1", TABLET_COLUMNS[chips.length])}
    >
      {chips.map((chip, index) => {
        const pressed = chip.id === chosen;
        return (
          <button
            key={chip.id}
            type="button"
            aria-pressed={pressed}
            onClick={() => onChoose(chip.id)}
            className={cn(
              "flex min-h-11 cursor-pointer items-center justify-between gap-2 rounded-2xl border px-4 py-2 text-left text-sm font-semibold select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white lg:rounded-2xl",
              index === 0 && chips.length % 2 === 1 && "col-span-2 lg:col-span-1",
              // One row on a tablet: All takes one column like the rest.
              index === 0 && chips.length % 2 === 1 && TABLET_COLUMNS[chips.length] && "md:col-span-1",
              pressed
                ? "border-white bg-white text-teal-900"
                : "border-white/25 bg-white/10 text-white/85 hover:border-white/50 hover:text-white",
            )}
          >
            <span className="min-w-0 wrap-break-word">{chip.name}</span>
            <span
              className={cn(
                "shrink-0 rounded-full px-2 text-xs tabular-nums",
                pressed ? "bg-teal-900/10 text-teal-900" : "bg-white/15 text-white",
              )}
            >
              <span className="sr-only">, </span>
              {chip.count}
              <span className="sr-only"> {chip.count === 1 ? "question" : "questions"}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function FaqAccordion({ faqs }: { faqs: Faq[] }) {
  // The open question's id, or null when all are closed.
  const [openId, setOpenId] = useState<string | null>(null);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const baseId = useId();

  // Up / Down / Home / End move between the questions (the accordion
  // keyboard pattern); Tab, Enter and Space stay as the browser does them.
  const move = (event: React.KeyboardEvent, index: number) => {
    const last = faqs.length - 1;
    const to =
      event.key === "ArrowDown" ? (index === last ? 0 : index + 1)
      : event.key === "ArrowUp" ? (index === 0 ? last : index - 1)
      : event.key === "Home" ? 0
      : event.key === "End" ? last
      : null;
    if (to === null) return;
    event.preventDefault();
    buttons.current[to]?.focus();
  };

  return (
    <ul className="space-y-3">
      {faqs.map((faq, index) => {
        const open = openId === faq.id;
        const buttonId = `${baseId}-q-${index}`;
        const panelId = `${baseId}-a-${index}`;
        return (
          <li
            key={faq.id}
            className={cn(
              "relative overflow-hidden rounded-2xl border bg-white/10 transition-colors duration-300 motion-reduce:transition-none",
              open ? "border-white/60" : "border-white/25 hover:border-white/50",
            )}
          >
            {/* The open card's amber accent line, down its left edge. */}
            <span
              aria-hidden="true"
              className={cn(
                "absolute inset-y-0 left-0 w-1 bg-amber-300 transition-opacity duration-300 motion-reduce:transition-none",
                open ? "opacity-100" : "opacity-0",
              )}
            />
            <h3>
              <button
                ref={(element) => {
                  buttons.current[index] = element;
                }}
                id={buttonId}
                type="button"
                aria-expanded={open}
                aria-controls={panelId}
                onClick={() => setOpenId(open ? null : faq.id)}
                onKeyDown={(event) => move(event, index)}
                className="flex min-h-16 w-full cursor-pointer items-center gap-3 rounded-2xl px-4 py-3 text-left text-white select-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-white sm:gap-4 sm:px-5"
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-full border text-sm font-semibold tabular-nums transition-colors duration-300 motion-reduce:transition-none",
                    open ? "border-amber-300 text-amber-200" : "border-white/40 text-white/85",
                  )}
                >
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="min-w-0 flex-1 font-semibold wrap-break-word sm:text-lg">{faq.question}</span>
                <ChevronDown
                  aria-hidden="true"
                  className={cn(
                    "size-5 shrink-0 transition-transform duration-300 motion-reduce:transition-none",
                    open ? "rotate-180 text-amber-300" : "text-white/80",
                  )}
                />
              </button>
            </h3>
            {/* Slides open by growing its row from 0 to its own height. */}
            <div
              id={panelId}
              role="region"
              aria-labelledby={buttonId}
              inert={!open}
              className={cn(
                "grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none",
                open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
              )}
            >
              <div className="overflow-hidden">
                <div className="space-y-3 px-4 pb-5 leading-relaxed text-white/90 sm:pl-18 sm:pr-5">
                  {descriptionParagraphs(faq.answer).map((paragraph, at) => (
                    <p key={at} className="wrap-break-word whitespace-pre-line">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
