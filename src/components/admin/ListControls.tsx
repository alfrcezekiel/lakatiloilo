"use client";

import { ChevronLeft, ChevronRight, Clock, Sparkles, Star, type LucideIcon } from "lucide-react";
import { useId } from "react";
import { cn } from "@/lib/utils";

// Pages and sorting on the dashboard's lists (full admin management round,
// tickets 129–131, team request 2026-11-11): at the top, Sort with three
// choices, each with its icon, and Show 10 / 25 / 50; at the bottom,
// "Showing 11–20 of 168" and Previous · 1 2 3 … 17 · Next. Each screen
// says what its choices mean (docs/SPEC.md, "Pages and sorting").

export type SortChoice = "recent" | "relevant" | "top";

export const SORT_CHOICES: { id: SortChoice; label: string; icon: LucideIcon }[] = [
  { id: "recent", label: "Recently added", icon: Clock },
  { id: "relevant", label: "Most relevant", icon: Sparkles },
  { id: "top", label: "Top-rated", icon: Star },
];

export const PER_PAGE_CHOICES = [10, 25, 50] as const;
export type PerPage = (typeof PER_PAGE_CHOICES)[number];

// Phones (team report 2026-11-11: at 425, 375 and 320 px the buttons
// wrapped into uneven rows): three equal buttons in a row, the icon above
// the label. From 640 px: one row of pills, as before.
const pill =
  "flex min-h-14 min-w-0 cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border px-1 py-2 text-center text-xs leading-tight font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:min-h-11 sm:flex-row sm:gap-2 sm:rounded-full sm:px-4 sm:py-0 sm:text-sm";

export function ListControls({
  sort,
  onSort,
  perPage,
  onPerPage,
}: {
  sort: SortChoice;
  onSort: (sort: SortChoice) => void;
  perPage: PerPage;
  onPerPage: (perPage: PerPage) => void;
}) {
  const perPageId = useId();
  const sortId = useId();
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <span id={sortId} className="text-sm font-semibold text-white/85">
          Sort
        </span>
        <div role="group" aria-labelledby={sortId} className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap">
          {SORT_CHOICES.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => onSort(id)}
              aria-pressed={sort === id}
              className={cn(
                pill,
                sort === id
                  ? "border-amber-300 text-amber-200"
                  : "border-white/40 text-white/85 hover:border-white/70 hover:text-white",
              )}
            >
              <Icon aria-hidden="true" className="size-4 shrink-0" />
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <label htmlFor={perPageId} className="text-sm font-semibold text-white/85">
          Show
        </label>
        <select
          id={perPageId}
          value={perPage}
          onChange={(e) => onPerPage(Number(e.target.value) as PerPage)}
          className="min-h-11 min-w-0 flex-1 cursor-pointer rounded-xl border border-white/45 bg-transparent px-3 text-base text-white focus:border-white/90 focus:outline-none *:bg-teal-950 *:text-white sm:flex-none"
        >
          {PER_PAGE_CHOICES.map((n) => (
            <option key={n} value={n}>
              {n} per page
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

// "Showing 11–20 of 168" (or of `total` things, e.g. "reviews").
export function showingText(page: number, perPage: number, total: number, things: string) {
  if (total === 0) return `No ${things}.`;
  const from = (page - 1) * perPage + 1;
  const to = Math.min(total, page * perPage);
  return `Showing ${from}–${to} of ${total} ${things}.`;
}

export const pageCount = (total: number, perPage: number) => Math.max(1, Math.ceil(total / perPage));

// The page numbers to show: the first, the last, and the ones next to the
// current page, with "…" for the gaps. 1 2 [3] 4 … 17
export function pageItems(page: number, pages: number): (number | "gap")[] {
  const keep = new Set([1, pages, page - 1, page, page + 1]);
  const items: (number | "gap")[] = [];
  for (let n = 1; n <= pages; n += 1) {
    if (keep.has(n)) items.push(n);
    else if (items[items.length - 1] !== "gap") items.push("gap");
  }
  return items;
}

const pageButton =
  "inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center gap-1 rounded-xl border px-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-default disabled:opacity-40";

// Previous · 1 2 3 … 17 · Next. Hidden when everything fits on one page.
// On phones: ‹ Previous · Page 2 of 17 · Next › in one row (the numbers
// wrapped into uneven rows at 425 px and below); the numbers from 640 px.
export function Pagination({
  page,
  pages,
  onPage,
  label,
}: {
  page: number;
  pages: number;
  onPage: (page: number) => void;
  // "Pages of reviews", read out by screen readers.
  label: string;
}) {
  if (pages <= 1) return null;
  return (
    <nav
      aria-label={label}
      className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 pt-2 sm:flex sm:flex-wrap sm:justify-center"
    >
      <button
        type="button"
        onClick={() => onPage(page - 1)}
        disabled={page <= 1}
        className={cn(pageButton, "border-white/40 hover:border-amber-300 hover:text-amber-300")}
      >
        <ChevronLeft aria-hidden="true" className="size-4" />
        Previous
      </button>
      <span className="text-center text-sm whitespace-nowrap text-white/85 sm:hidden">
        Page {page} of {pages}
      </span>
      {pageItems(page, pages).map((item, index) =>
        item === "gap" ? (
          <span key={`gap-${index}`} aria-hidden="true" className="hidden px-1 text-white/70 sm:inline">
            …
          </span>
        ) : (
          <button
            key={item}
            type="button"
            onClick={() => onPage(item)}
            aria-current={item === page ? "page" : undefined}
            aria-label={`Page ${item}`}
            className={cn(
              pageButton,
              "hidden sm:inline-flex",
              item === page
                ? "border-white bg-white text-teal-900"
                : "border-white/40 hover:border-amber-300 hover:text-amber-300",
            )}
          >
            {item}
          </button>
        ),
      )}
      <button
        type="button"
        onClick={() => onPage(page + 1)}
        disabled={page >= pages}
        className={cn(pageButton, "border-white/40 hover:border-amber-300 hover:text-amber-300")}
      >
        Next
        <ChevronRight aria-hidden="true" className="size-4" />
      </button>
    </nav>
  );
}
