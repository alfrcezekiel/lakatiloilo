"use client";

import { AlertTriangle, MapPin, Pencil, Plus, Search, Star, X } from "lucide-react";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AdminShell } from "@/components/admin/AdminShell";
import { adminGlass } from "@/components/admin/AdminFrame";
import { DeletePlaceButton } from "@/components/admin/DeletePlaceButton";
import {
  ListControls,
  Pagination,
  pageCount,
  showingText,
  type PerPage,
  type SortChoice,
} from "@/components/admin/ListControls";
import { usePendingKeys } from "@/components/admin/PendingDeletes";
import { AdminLoadError, adminQuerySettings } from "@/components/admin/admin-ui";
import { Skeleton } from "@/components/ui/skeleton";
import { getAdminPlaces, type AdminPlaceRow, type AdminPlaceType } from "@/lib/api";
import { freshToken } from "@/lib/login";
import { cn } from "@/lib/utils";

// The team's Places screen (/admin/places, admin dashboard & moderation
// round, ticket 112): every destination and accommodation in one list the
// team can search, each with Edit. "Add a place" (ticket 120) opens the
// same form, empty, at /admin/places/new. Since ticket 129 the list is in
// pages, with Sort (Recently added, Most relevant = most reviews,
// Top-rated = highest average stars) and Show 10 / 25 / 50. Every place is
// already loaded, so the pages are made here in the browser.

// Newest first, then by name, so the order never jumps between pages.
const byNewest = (a: AdminPlaceRow, b: AdminPlaceRow) =>
  b.created_at.localeCompare(a.created_at) || a.name.localeCompare(b.name);
const SORTS: Record<SortChoice, (a: AdminPlaceRow, b: AdminPlaceRow) => number> = {
  recent: byNewest,
  relevant: (a, b) => b.review_count - a.review_count || byNewest(a, b),
  // Places with no reviews last.
  top: (a, b) => (b.average_rating ?? -1) - (a.average_rating ?? -1) || byNewest(a, b),
};

export const ADMIN_PLACES_KEY = ["admin", "places"] as const;

export const typeLabel = (type: AdminPlaceType) => (type === "destination" ? "Destination" : "Accommodation");

// "beach" -> "Beach", "bed_and_breakfast" -> "Bed and breakfast".
export const kindLabel = (kind: string) => {
  const words = kind.replace(/_/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
};

type Filter = "all" | AdminPlaceType;
const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "destination", label: "Destinations" },
  { id: "accommodation", label: "Accommodations" },
];

const matches = (place: AdminPlaceRow, words: string[]) => {
  // "credit missing" too, so searching "credit" finds the photos to check.
  const haystack =
    `${place.name} ${place.address} ${place.kind} ${typeLabel(place.type)} ${place.credit_missing ? "credit missing" : ""}`.toLowerCase();
  return words.every((word) => haystack.includes(word));
};

function PlaceRow({ place }: { place: AdminPlaceRow }) {
  return (
    <li className="flex flex-col gap-3 rounded-xl border border-white/20 px-4 py-3 sm:flex-row sm:items-center sm:gap-4">
      <div className="min-w-0 flex-1">
        <p className="font-semibold wrap-break-word">{place.name}</p>
        {/* Ticket 134: the photo still needs its credits and copyright
            checked (none saved, or "Not checked yet"). */}
        {place.credit_missing && (
          <p className="mt-1">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/70 px-2.5 py-0.5 text-xs font-semibold text-amber-200">
              <AlertTriangle aria-hidden="true" className="size-3.5 shrink-0" />
              Credit missing
            </span>
          </p>
        )}
        <p className="mt-0.5 text-sm text-white/80">
          {typeLabel(place.type)} · {kindLabel(place.kind)}
        </p>
        {/* What the sorting uses (ticket 129): stars and reviews. */}
        <p className="mt-0.5 flex items-center gap-1.5 text-sm text-white/75">
          <Star aria-hidden="true" className="size-3.5 shrink-0 text-amber-300" />
          {place.average_rating === null
            ? "No reviews yet"
            : `${place.average_rating.toFixed(1)} · ${place.review_count} ${place.review_count === 1 ? "review" : "reviews"}`}
        </p>
        <p className="mt-0.5 flex items-start gap-1.5 text-sm text-white/75">
          <MapPin aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
          <span className="wrap-break-word">{place.address}</span>
        </p>
      </div>
      {/* Phones: Edit and Delete share the card's width equally. */}
      <div className="grid shrink-0 grid-cols-2 gap-2 sm:flex sm:self-center">
        <Link
          href={`/admin/places/${place.type}/${place.id}`}
          aria-label={`Edit ${place.name}`}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/40 px-4 text-sm font-semibold transition-colors hover:border-amber-300 hover:text-amber-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          <Pencil aria-hidden="true" className="size-4" />
          Edit
        </Link>
        {/* Delete (ticket 121): a confirmation pop-up first. */}
        <DeletePlaceButton place={place} className="rounded-xl px-4" />
      </div>
    </li>
  );
}

// Every place. Called by the page itself too, so the request starts at
// once (see adminQuerySettings).
function usePlaces() {
  return useQuery({
    queryKey: ADMIN_PLACES_KEY,
    queryFn: async () => {
      const token = await freshToken();
      if (!token) throw new Error("Please log in again, then try again.");
      return getAdminPlaces(token);
    },
    ...adminQuerySettings(),
  });
}

function PlacesSkeleton() {
  return (
    <div className="space-y-3">
      <p role="status" className="sr-only">
        Loading places
      </p>
      <Skeleton className="h-36 w-full rounded-2xl" />
      <Skeleton className="h-5 w-40" />
      <Skeleton className="h-96 w-full rounded-2xl" />
    </div>
  );
}

function PlacesList() {
  const [query, setQueryOnly] = useState("");
  const [filter, setFilterOnly] = useState<Filter>("all");
  const [sort, setSortOnly] = useState<SortChoice>("recent");
  const [perPage, setPerPageOnly] = useState<PerPage>(10);
  const [page, setPage] = useState(1);
  // A new search, filter, sort or number per page starts at page 1.
  const fromPageOne =
    <T,>(set: (value: T) => void) =>
    (value: T) => {
      set(value);
      setPage(1);
    };
  const setQuery = fromPageOne(setQueryOnly);
  const setFilter = fromPageOne(setFilterOnly);
  const setSort = fromPageOne(setSortOnly);
  const setPerPage = fromPageOne(setPerPageOnly);
  // Moving to another page: the line "Showing 11–20 of 37" gets the focus,
  // so keyboard and screen reader users start at the top of the new page.
  const statusLine = useRef<HTMLParagraphElement>(null);
  const places = usePlaces();
  // Places waiting for Undo (ticket 127) are left out; the Undo line at
  // the bottom says what was deleted.
  const pendingKeys = usePendingKeys();
  const listed = useMemo(
    () => (places.data ?? []).filter((place) => !pendingKeys.has(`place:${place.id}`)),
    [places.data, pendingKeys],
  );

  const shown = useMemo(() => {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    return listed
      .filter((place) => (filter === "all" || place.type === filter) && matches(place, words))
      .sort(SORTS[sort]);
  }, [listed, query, filter, sort]);

  if (places.isPending) return <PlacesSkeleton />;

  if (places.isError) {
    return <AdminLoadError what="the places" error={places.error} onRetry={() => void places.refetch()} />;
  }

  const total = listed.length;
  const pages = pageCount(shown.length, perPage);
  // A delete can empty the last page: show the one before it.
  const current = Math.min(page, pages);
  const onPage = shown.slice((current - 1) * perPage, current * perPage);
  const goTo = (next: number) => {
    setPage(next);
    requestAnimationFrame(() => {
      statusLine.current?.focus({ preventScroll: true });
      statusLine.current?.scrollIntoView({ block: "start", behavior: "smooth" });
    });
  };
  return (
    <div className="space-y-4">
      <Link
        href="/admin/places/new"
        className="inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-5 font-semibold text-teal-900 hover:bg-white/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        <Plus aria-hidden="true" className="size-4" />
        Add a place
      </Link>
      <div className={cn(adminGlass, "space-y-3 p-4 sm:p-5")}>
        <label htmlFor="place-search" className="text-sm font-semibold">
          Find a place
        </label>
        {/* A bordered box that brightens when typing, never a white fill. */}
        <div className="flex items-center gap-2 rounded-xl border border-white/45 px-3 focus-within:border-white/90">
          <Search aria-hidden="true" className="size-4 shrink-0 text-white/75" />
          <input
            id="place-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Name, address or kind"
            autoComplete="off"
            // The browser's own clear "x" is hidden: the Clear search button
            // next to it does the same (team request, 2026-11-08).
            className="min-h-11 w-full min-w-0 bg-transparent text-base text-white placeholder:text-white/70 focus:outline-none [&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-white/80 hover:text-amber-300 focus-visible:outline-2 focus-visible:outline-white"
            >
              <X aria-hidden="true" className="size-4" />
            </button>
          )}
        </div>
        {/* Phones: one full row, each button as wide as its name plus an
            equal share of the rest (at 320 px "Accommodations" needs it);
            from 640 px a row of pills. */}
        <div role="group" aria-label="Show" className="flex gap-2 sm:flex-wrap">
          {FILTERS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setFilter(id)}
              aria-pressed={filter === id}
              className={cn(
                // Below 360 px the names are a touch smaller, so the three
                // fit in one row at 320 px; each is at least 44 px wide.
                "min-h-11 min-w-11 flex-auto cursor-pointer rounded-full border px-2 text-xs font-semibold whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white max-[359px]:text-[0.6875rem] sm:flex-none sm:px-4 sm:text-sm",
                filter === id
                  ? "border-white bg-white text-teal-900"
                  : "border-white/40 text-white/85 hover:text-white",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <ListControls sort={sort} onSort={setSort} perPage={perPage} onPerPage={setPerPage} />

      <p
        ref={statusLine}
        tabIndex={-1}
        role="status"
        className="scroll-mt-24 text-white/85 focus:outline-none"
      >
        {showingText(current, perPage, shown.length, "places")}
        {shown.length !== total && ` (${shown.length} of ${total} match.)`}
      </p>

      {shown.length === 0 ? (
        <div className={cn(adminGlass, "p-6")}>
          <p className="font-semibold">No places match.</p>
          <p className="mt-1 text-white/85">Try another word, or show all places.</p>
        </div>
      ) : (
        <ul className={cn(adminGlass, "space-y-2 p-3 sm:p-4")}>
          {onPage.map((place) => (
            <PlaceRow key={`${place.type}-${place.id}`} place={place} />
          ))}
        </ul>
      )}

      <Pagination page={current} pages={pages} onPage={goTo} label="Pages of places" />
    </div>
  );
}

export function AdminPlaces() {
  usePlaces();
  return (
    <AdminShell title="Places" skeleton={<PlacesSkeleton />}>
      {/* Categories and kinds moved to their own page (sidebar), team
          request 2026-11-11. */}
      <PlacesList />
    </AdminShell>
  );
}
