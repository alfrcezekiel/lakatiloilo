"use client";

import { MapPin, Pencil, Search, X } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AdminShell } from "@/components/admin/AdminShell";
import { adminGlass } from "@/components/admin/AdminFrame";
import { AdminLoadError } from "@/components/admin/admin-ui";
import { Skeleton } from "@/components/ui/skeleton";
import { getAdminPlaces, type AdminPlaceRow, type AdminPlaceType } from "@/lib/api";
import { freshToken } from "@/lib/login";
import { cn } from "@/lib/utils";

// The team's Places screen (/admin/places, admin dashboard & moderation
// round, ticket 112): every destination and accommodation in one list the
// team can search, each with Edit. Adding and deleting places is not part
// of this round.

export const ADMIN_PLACES_KEY = ["admin", "places"] as const;

const typeLabel = (type: AdminPlaceType) => (type === "destination" ? "Destination" : "Accommodation");

// "beach" -> "Beach", "bed_and_breakfast" -> "Bed and breakfast".
const kindLabel = (kind: string) => {
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
  const haystack = `${place.name} ${place.address} ${place.kind} ${typeLabel(place.type)}`.toLowerCase();
  return words.every((word) => haystack.includes(word));
};

function PlaceRow({ place }: { place: AdminPlaceRow }) {
  return (
    <li className="flex flex-col gap-3 rounded-xl border border-white/20 px-4 py-3 sm:flex-row sm:items-center sm:gap-4">
      <div className="min-w-0 flex-1">
        <p className="font-semibold break-words">{place.name}</p>
        <p className="mt-0.5 text-sm text-white/80">
          {typeLabel(place.type)} · {kindLabel(place.kind)}
        </p>
        <p className="mt-0.5 flex items-start gap-1.5 text-sm text-white/75">
          <MapPin aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
          <span className="break-words">{place.address}</span>
        </p>
      </div>
      <Link
        href={`/admin/places/${place.type}/${place.id}`}
        aria-label={`Edit ${place.name}`}
        className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 self-start rounded-xl border border-white/40 px-4 text-sm font-semibold transition-colors hover:border-amber-300 hover:text-amber-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:self-center"
      >
        <Pencil aria-hidden="true" className="size-4" />
        Edit
      </Link>
    </li>
  );
}

function PlacesList() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const places = useQuery({
    queryKey: ADMIN_PLACES_KEY,
    queryFn: async () => {
      const token = await freshToken();
      if (!token) throw new Error("Please log in again, then try again.");
      return getAdminPlaces(token);
    },
  });

  const shown = useMemo(() => {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    return (places.data ?? []).filter(
      (place) => (filter === "all" || place.type === filter) && matches(place, words),
    );
  }, [places.data, query, filter]);

  if (places.isPending) {
    return (
      <div className="space-y-3">
        <p role="status" className="sr-only">
          Loading places
        </p>
        <Skeleton className="h-14 w-full rounded-2xl" />
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    );
  }

  if (places.isError) {
    return <AdminLoadError what="the places" error={places.error} onRetry={() => void places.refetch()} />;
  }

  const total = places.data.length;
  return (
    <div className="space-y-4">
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
        <div role="group" aria-label="Show" className="flex flex-wrap gap-2">
          {FILTERS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setFilter(id)}
              aria-pressed={filter === id}
              className={cn(
                "min-h-11 cursor-pointer rounded-full border px-4 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white",
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

      <p role="status" className="text-white/85">
        {shown.length === total
          ? `${total} places, A to Z.`
          : `${shown.length} of ${total} places match.`}
      </p>

      {shown.length === 0 ? (
        <div className={cn(adminGlass, "p-6")}>
          <p className="font-semibold">No places match.</p>
          <p className="mt-1 text-white/85">Try another word, or show all places.</p>
        </div>
      ) : (
        <ul className={cn(adminGlass, "space-y-2 p-3 sm:p-4")}>
          {shown.map((place) => (
            <PlaceRow key={`${place.type}-${place.id}`} place={place} />
          ))}
        </ul>
      )}
    </div>
  );
}

export function AdminPlaces() {
  return (
    <AdminShell title="Places">
      <PlacesList />
    </AdminShell>
  );
}
