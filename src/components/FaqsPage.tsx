"use client";

import { ArrowLeft, ArrowRight, CircleHelp, Compass, Info, MapPinned, Tag, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FaqAccordion } from "@/components/FaqSection";
import type { Faq, FaqTopic } from "@/lib/api";
import { topicsOf } from "@/lib/faqs";
import { useTableChanges } from "@/lib/realtime";
import { cn } from "@/lib/utils";

// The FAQs page itself (/faqs, ticket 173; redesigned the same day, team
// request: "intuitive, good-eye visualization and user-friendly
// navigation").
//
//   - A header: a small "Help for travelers" label, the title, one line,
//     and how many answers and topics there are.
//   - A topic menu, each topic with its icon and count. On a laptop it is
//     a left column that stays in place while the traveler scrolls and
//     marks the topic being read (aria-current). On phones it is a grid of
//     2 equal columns, so no row is uneven (frontend rules).
//   - One glass section per topic (the built-in topics first, then the
//     ones the team typed under Other, A to Z): its icon, name and count,
//     then its accordion, like the home page's.
//   - A closing card: "Ready to explore Iloilo?" with one centred
//     "Explore destinations" button (Back to Home is at the top).
// Glass without blur and no white tint on hover: the page sits on the
// plain teal background (frontend rules).
//
// Live: when the team changes a question, the faq_signals doorbell rings
// (supabase/migrations/…_faq_signals.sql) and the page asks the Next.js
// server again (router.refresh), which asks the backend. The rows Realtime
// sends are never used, and the open question stays open.

const LISTEN = ["faq_signals"] as const;

// Each built-in topic's icon; a topic typed under Other gets a tag.
const TOPIC_ICONS: Record<string, LucideIcon> = {
  new_to_iloilo: Compass,
  about_platform: Info,
  finding_places: MapPinned,
};
const iconFor = (topic: FaqTopic) => TOPIC_ICONS[topic] ?? Tag;

const sectionId = (index: number) => `faq-topic-${index}`;
const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

export function FaqsPage({ faqs, failed }: { faqs: Faq[]; failed: boolean }) {
  const router = useRouter();
  useTableChanges(LISTEN, router.refresh);
  const topics = topicsOf(faqs);
  const current = useCurrentSection(topics.length);

  return (
    <main className="min-h-screen bg-linear-to-br from-teal-900 to-emerald-800 text-white">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <Link
          href="/"
          className="inline-flex h-11 items-center gap-2 rounded-(--radius) border border-white/25 bg-white/20 px-4 text-sm font-medium text-white transition-colors hover:bg-white/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Back to Home
        </Link>

        <header className="mt-10 max-w-3xl">
          <p className="inline-flex items-center gap-2 rounded-full border border-amber-300/60 px-3 py-1 text-xs font-semibold tracking-wide text-amber-200 uppercase">
            <CircleHelp aria-hidden="true" className="size-4" />
            Help for travelers
          </p>
          <h1 className="font-fraunces mt-4 text-4xl font-medium sm:text-5xl">Frequently asked questions</h1>
          <p className="mt-3 text-lg text-white/85">
            New to Iloilo or to Lakat Iloilo? Pick a topic, then open a question to read its answer.
          </p>
          {!failed && topics.length > 0 && (
            <p className="mt-4 text-sm text-white/75">
              {plural(faqs.length, "answer")} · {plural(topics.length, "topic")}
            </p>
          )}
        </header>

        {failed ? (
          <div role="alert" className="mt-10 max-w-3xl rounded-2xl border border-white/25 bg-white/15 p-6">
            <p className="font-semibold">We couldn&apos;t load the questions right now.</p>
            <p className="mt-1 text-white/80">Please check your connection and try again.</p>
          </div>
        ) : topics.length === 0 ? (
          <p className="mt-10 text-white/85">There are no questions here yet. Please check back soon.</p>
        ) : (
          <div className="mt-10 lg:grid lg:grid-cols-[minmax(0,16rem)_minmax(0,1fr)] lg:gap-10">
            {/* The topic menu: sticky on a laptop (lg:top-8). */}
            <nav aria-label="Topics" className="lg:sticky lg:top-8 lg:self-start">
              <p className="mb-3 hidden text-xs font-semibold tracking-widest text-white/70 uppercase lg:block">
                Topics
              </p>
              <ul className="grid grid-cols-2 gap-2 lg:grid-cols-1">
                {topics.map((topic, index) => {
                  const Icon = iconFor(topic.id);
                  const count = faqs.filter((faq) => faq.topic === topic.id).length;
                  const here = current === index;
                  return (
                    // Phones: with an odd count the last one spans both
                    // columns, so no row is half empty.
                    <li
                      key={topic.id}
                      className={cn(
                        "grid",
                        index === topics.length - 1 && topics.length % 2 === 1 && "col-span-2 lg:col-span-1",
                      )}
                    >
                      <a
                        href={`#${sectionId(index)}`}
                        aria-current={here ? "true" : undefined}
                        className={cn(
                          "flex min-h-11 items-center gap-3 rounded-2xl border bg-white/10 px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white motion-reduce:transition-none",
                          here
                            ? "border-amber-300/80 text-amber-200"
                            : "border-white/25 text-white/85 hover:border-white/50 hover:text-white",
                        )}
                      >
                        <Icon aria-hidden="true" className="size-4 shrink-0" />
                        <span className="min-w-0 flex-1 wrap-break-word">{topic.name}</span>
                        <span className="shrink-0 rounded-full bg-white/15 px-2 text-xs text-white tabular-nums">
                          <span className="sr-only">, </span>
                          {count}
                          <span className="sr-only"> {count === 1 ? "question" : "questions"}</span>
                        </span>
                      </a>
                    </li>
                  );
                })}
              </ul>
            </nav>

            <div className="mt-10 space-y-8 lg:mt-0">
              {topics.map((topic, index) => {
                const Icon = iconFor(topic.id);
                const inTopic = faqs.filter((faq) => faq.topic === topic.id);
                return (
                  <section
                    key={topic.id}
                    id={sectionId(index)}
                    data-faq-section={index}
                    aria-labelledby={`${sectionId(index)}-title`}
                    className="scroll-mt-6 rounded-3xl border border-white/20 bg-white/5 p-4 sm:p-6"
                  >
                    <div className="mb-5 flex items-center gap-3">
                      <span
                        aria-hidden="true"
                        className="flex size-11 shrink-0 items-center justify-center rounded-full border border-amber-300/60 text-amber-200"
                      >
                        <Icon className="size-5" />
                      </span>
                      <div className="min-w-0">
                        <h2 id={`${sectionId(index)}-title`} className="text-2xl font-semibold wrap-break-word">
                          {topic.name}
                        </h2>
                        <p className="text-sm text-white/75">{plural(inTopic.length, "question")}</p>
                      </div>
                    </div>
                    <FaqAccordion faqs={inTopic} />
                  </section>
                );
              })}

              {/* The closing card: where to go once the questions are answered. */}
              <section
                aria-labelledby="faqs-next-title"
                className="rounded-3xl border border-amber-300/40 bg-white/10 p-6 sm:p-8"
              >
                <h2 id="faqs-next-title" className="font-fraunces text-2xl font-medium">
                  Ready to explore Iloilo?
                </h2>
                <p className="mt-2 text-white/85">
                  Browse mountains, food spots, festivals and places to stay, with photos, maps and reviews from other
                  travelers.
                </p>
                {/* One button, in the middle of the card (team request
                    2026-11-28: no Back to Home here; it stays at the top). */}
                <div className="mt-5 flex justify-center">
                  <Link
                    href="/#explore-categories"
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-white bg-white px-5 text-sm font-semibold text-teal-900 hover:bg-white/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                  >
                    Explore destinations
                    <ArrowRight aria-hidden="true" className="size-4" />
                  </Link>
                </div>
              </section>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

// Which topic section the traveler is reading: the one crossing a line a
// third of the way down the screen. The menu marks it (aria-current).
function useCurrentSection(count: number): number {
  const [current, setCurrent] = useState(0);
  useEffect(() => {
    if (count === 0) return;
    const sections = [...document.querySelectorAll<HTMLElement>("[data-faq-section]")];
    const observer = new IntersectionObserver(
      (entries) => {
        const hit = entries.find((entry) => entry.isIntersecting);
        if (hit) setCurrent(Number((hit.target as HTMLElement).dataset.faqSection));
      },
      { rootMargin: "-33% 0px -66% 0px" },
    );
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [count]);
  return current;
}
