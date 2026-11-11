"use client";

import { AlignLeft, BedDouble, Check, Compass, Copyright, ExternalLink, MapPin, Pencil, Plus } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { adminGlass } from "@/components/admin/AdminFrame";
import { PlaceEditSkeleton, backToPlaces } from "@/components/admin/AdminPlaceEdit";
import { PlaceForm } from "@/components/admin/PlaceForm";
import { kindLabel, typeLabel } from "@/components/admin/AdminPlaces";
import type { AdminPlaceDetails } from "@/lib/api";
import { locationLabels } from "@/lib/labels";
import { cn } from "@/lib/utils";

// Adding a place (/admin/places/new, full admin management round, ticket
// 120): the Edit form, empty, with Destination or Accommodation and a
// required photo; then what was added, with where to go next. Moved out
// of AdminPlaceEdit.tsx in the code review of 2026-11-11.

// After adding (team request 2026-11-11: its own design, not a plain
// line): a showcase of the new place, the photo large with the name on
// it, a "Live on the site" badge, its details, and three tiles for what
// to do next. The card takes the focus and is read out (role="status").
function AddedPanel({ place, onAnother }: { place: AdminPlaceDetails; onAnother: () => void }) {
  const card = useRef<HTMLDivElement>(null);
  useEffect(() => card.current?.focus(), []);
  const placeHref = `/${place.type === "accommodation" ? "accommodations" : "destinations"}/${place.id}`;
  const TypeIcon = place.type === "accommodation" ? BedDouble : Compass;
  const chips = [kindLabel(place.kind), locationLabels[place.location_type] ?? kindLabel(place.location_type)];
  return (
    <div
      ref={card}
      tabIndex={-1}
      role="status"
      className={cn(
        adminGlass,
        "overflow-hidden border-emerald-300/40 focus:outline-none focus-visible:outline-2 focus-visible:outline-white motion-safe:animate-fade-up",
      )}
    >
      <div className="grid lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        {/* The photo, with the name and its labels on it. */}
        <div className="relative isolate flex min-h-64 flex-col justify-end sm:min-h-80">
          {place.photo_url ? (
            <img
              src={place.photo_url}
              alt=""
              className="absolute inset-0 -z-20 size-full object-cover"
            />
          ) : (
            <div aria-hidden="true" className="absolute inset-0 -z-20 bg-teal-800" />
          )}
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10 bg-linear-to-t from-teal-950 via-teal-950/55 to-transparent"
          />
          <span className="absolute top-4 left-4 inline-flex items-center gap-2 rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white">
            <span aria-hidden="true" className="relative flex size-2">
              <span className="absolute inline-flex size-full rounded-full bg-white opacity-75 motion-safe:animate-ping" />
              <span className="relative inline-flex size-2 rounded-full bg-white" />
            </span>
            Live on the site
          </span>
          <div className="space-y-3 p-5 sm:p-8">
            <p className="flex items-center gap-2 text-xs font-semibold tracking-[0.2em] text-amber-200 uppercase">
              <TypeIcon aria-hidden="true" className="size-4 shrink-0" />
              New {typeLabel(place.type).toLowerCase()} added
            </p>
            <h2 className="font-fraunces text-3xl leading-tight font-medium wrap-break-word sm:text-4xl">
              {place.name}
            </h2>
            <ul aria-label="Labels" className="flex flex-wrap gap-2">
              {chips.map((chip) => (
                <li
                  key={chip}
                  className="rounded-full border border-white/40 bg-teal-950/60 px-3 py-1 text-xs font-semibold text-white"
                >
                  {chip}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* The details, then what to do next. */}
        <div className="flex flex-col gap-5 p-5 sm:p-8">
          <p className="flex items-start gap-3 text-emerald-100">
            <span
              aria-hidden="true"
              className="flex size-9 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-teal-950"
            >
              <Check className="size-5" strokeWidth={3} />
            </span>
            <span className="pt-1.5 text-sm leading-relaxed">
              <span className="font-semibold">{place.name}</span> was added. Travelers can find it on the site now.
            </span>
          </p>
          <dl className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <dt className="sr-only">Address</dt>
              <MapPin aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-amber-300" />
              <dd className="wrap-break-word text-white/90">{place.address}</dd>
            </div>
            <div className="flex items-start gap-3">
              <dt className="sr-only">Description</dt>
              <AlignLeft aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-amber-300" />
              <dd className="line-clamp-3 wrap-break-word text-white/80">{place.description}</dd>
            </div>
            {place.credits && (
              <div className="flex items-start gap-3">
                <dt className="sr-only">Photo credits</dt>
                <Copyright aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-amber-300" />
                <dd className="wrap-break-word text-white/80">{place.credits.credit_line}</dd>
              </div>
            )}
          </dl>
          <div className="mt-auto space-y-3">
            <p className="text-xs font-semibold tracking-[0.2em] text-white/70 uppercase">What&apos;s next</p>
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
              <Link href={placeHref} className={tile}>
                <ExternalLink aria-hidden="true" className="size-5 shrink-0 text-amber-300" />
                <span>
                  <span className="block font-semibold">View the place page</span>
                  <span className="block text-xs text-white/70">See it as travelers do</span>
                </span>
              </Link>
              <Link href={`/admin/places/${place.type}/${place.id}`} className={tile}>
                <Pencil aria-hidden="true" className="size-5 shrink-0 text-amber-300" />
                <span>
                  <span className="block font-semibold">Edit it</span>
                  <span className="block text-xs text-white/70">Fix a detail or the photo</span>
                </span>
              </Link>
              <button type="button" onClick={onAnother} className={cn(tile, "cursor-pointer text-left")}>
                <Plus aria-hidden="true" className="size-5 shrink-0 text-amber-300" />
                <span>
                  <span className="block font-semibold">Add another place</span>
                  <span className="block text-xs text-white/70">Start an empty form</span>
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// One "What's next" tile: an icon, a name and a short hint. Hover
// brightens the border and the name (no tint behind it, frontend rules).
const tile =
  "flex min-h-16 items-center gap-3 rounded-xl border border-white/25 px-4 py-3 text-sm text-white transition-colors hover:border-amber-300 hover:text-amber-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white xl:flex-col xl:items-start";

// The "Add a place" page (/admin/places/new, ticket 120).
export function AdminPlaceNew() {
  const [added, setAdded] = useState<AdminPlaceDetails | null>(null);
  // A new key empties the form for "Add another place".
  const [round, setRound] = useState(0);
  return (
    <AdminShell
      title="Add a place"
      skeleton={
        <>
          {backToPlaces}
          <PlaceEditSkeleton />
        </>
      }
    >
      {backToPlaces}
      {added ? (
        <AddedPanel
          place={added}
          onAnother={() => {
            setAdded(null);
            setRound((n) => n + 1);
          }}
        />
      ) : (
        <PlaceForm key={round} onAdded={setAdded} />
      )}
    </AdminShell>
  );
}
