"use client";

import { Check, ChevronDown, Plus, Trash2 } from "lucide-react";
import { useId, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { adminGlass } from "@/components/admin/AdminFrame";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminLoadError, adminQuerySettings, errorMessage, plural } from "@/components/admin/admin-ui";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import {
  addAdminCategory,
  CATEGORY_NAME,
  deleteAdminCategory,
  getAdminCategories,
  type AdminPlaceType,
  type PlaceCategoryWithCount,
} from "@/lib/api";
import { freshToken } from "@/lib/login";
import { cn } from "@/lib/utils";

// The "Categories and kinds" screen (/admin/categories, full admin
// management round, ticket 116; its own page in the sidebar since the
// team's request of 2026-11-11, it was at the bottom of Places): the destination categories and the
// accommodation kinds, each with how many places use it. The team adds a
// new one by name and deletes one that no place uses. The database checks
// everything again (supabase/sql/047): only admins, a name used once, and
// never deleting one in use.

export const ADMIN_CATEGORIES_KEY = ["admin", "categories"] as const;

export function useAdminCategories() {
  return useQuery({
    queryKey: ADMIN_CATEGORIES_KEY,
    queryFn: async () => {
      const token = await freshToken();
      if (!token) throw new Error("Please log in again, then try again.");
      return getAdminCategories(token);
    },
    ...adminQuerySettings(),
  });
}

const smallButton =
  "inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border px-3 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-default disabled:opacity-60";

function CategoryRow({
  category,
  onDone,
}: {
  category: PlaceCategoryWithCount;
  onDone: (message: string) => void;
}) {
  const queryClient = useQueryClient();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inUse = category.place_count > 0;

  const remove = async () => {
    setBusy(true);
    setError(null);
    try {
      const token = await freshToken();
      if (!token) throw new Error("Please log in again, then try again.");
      const { message } = await deleteAdminCategory(token, category.id);
      queryClient.setQueryData<PlaceCategoryWithCount[]>(ADMIN_CATEGORIES_KEY, (list) =>
        list?.filter((c) => c.id !== category.id),
      );
      void queryClient.invalidateQueries({ queryKey: ADMIN_CATEGORIES_KEY });
      onDone(message);
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  };

  return (
    <li className="rounded-xl border border-white/20 px-4 py-2">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <div className="min-w-0 flex-1">
          <p className="font-semibold wrap-break-word">{category.name}</p>
          <p className="text-sm text-white/75">
            {inUse ? `Used by ${plural(category.place_count, "place")}` : "Not used yet"}
          </p>
        </div>
        {inUse ? (
          // In use: it cannot be deleted, and saying so beats a dead button.
          <span className="text-sm text-white/70">In use</span>
        ) : confirming ? (
          <div role="group" aria-label={`Delete ${category.name}?`} className="flex flex-wrap gap-2">
            <button
              type="button"
              autoFocus
              onClick={() => void remove()}
              disabled={busy}
              className={cn(smallButton, "border-red-500 bg-red-600 text-white hover:bg-red-500")}
            >
              {busy ? <Spinner /> : <Trash2 aria-hidden="true" className="size-4" />}
              {busy ? "Deleting…" : "Yes, delete"}
            </button>
            <button
              type="button"
              onClick={() => {
                setConfirming(false);
                setError(null);
              }}
              disabled={busy}
              className={cn(smallButton, "border-white/40 hover:border-amber-300 hover:text-amber-300")}
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            aria-label={`Delete ${category.name}`}
            className={cn(smallButton, "border-red-300/70 text-red-200 hover:border-red-200 hover:text-white")}
          >
            <Trash2 aria-hidden="true" className="size-4" />
            Delete
          </button>
        )}
      </div>
      {error && (
        <p role="alert" className="mt-1 text-sm font-medium text-amber-200">
          {error}
        </p>
      )}
    </li>
  );
}

function CategoryList({
  heading,
  categories,
  onDone,
}: {
  heading: string;
  categories: PlaceCategoryWithCount[];
  onDone: (message: string) => void;
}) {
  const headingId = useId();
  return (
    <div className="min-w-0">
      <h3 id={headingId} className="text-sm font-semibold text-white/90">
        {heading} ({categories.length})
      </h3>
      <ul aria-labelledby={headingId} className="mt-2 space-y-2">
        {categories.map((category) => (
          <CategoryRow key={category.id} category={category} onDone={onDone} />
        ))}
      </ul>
    </div>
  );
}

function AddCategory({ onDone }: { onDone: (message: string) => void }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [appliesTo, setAppliesTo] = useState<AdminPlaceType>("destination");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nameInput = useRef<HTMLInputElement>(null);

  const add = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length < CATEGORY_NAME.min || trimmed.length > CATEGORY_NAME.max) {
      setError(`Please write a name of ${CATEGORY_NAME.min} to ${CATEGORY_NAME.max} characters.`);
      nameInput.current?.focus();
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const token = await freshToken();
      if (!token) throw new Error("Please log in again, then try again.");
      const added = await addAdminCategory(token, trimmed, appliesTo);
      queryClient.setQueryData<PlaceCategoryWithCount[]>(ADMIN_CATEGORIES_KEY, (list) =>
        [...(list ?? []), added].sort((a, b) => a.name.localeCompare(b.name)),
      );
      void queryClient.invalidateQueries({ queryKey: ADMIN_CATEGORIES_KEY });
      setName("");
      onDone(`"${added.name}" was added. Give a place this ${appliesTo === "destination" ? "category" : "kind"} and it shows on the site.`);
    } catch (e) {
      setError(errorMessage(e));
      nameInput.current?.focus();
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={add} noValidate className="rounded-xl border border-white/20 p-4">
      <p className="text-sm font-semibold">Add a new one</p>
      <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1">
          <label htmlFor="category-name" className="text-xs font-semibold uppercase tracking-widest text-white/80">
            Name
          </label>
          <input
            ref={nameInput}
            id="category-name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError(null);
            }}
            maxLength={CATEGORY_NAME.max + 10}
            placeholder="For example, Beaches"
            autoComplete="off"
            aria-invalid={!!error}
            aria-describedby={error ? "category-name-error" : undefined}
            className="mt-1 min-h-11 w-full rounded-xl border border-white/45 bg-transparent px-3 text-base text-white placeholder:text-white/70 focus:border-white/90 focus:outline-none"
          />
        </div>
        <div className="sm:w-64 sm:shrink-0">
          <label htmlFor="category-for" className="text-xs font-semibold uppercase tracking-widest text-white/80">
            For
          </label>
          {/* Drawn like the Name box (team report 2026-11-10: the browser's
              own dropdown was a solid block with its arrow against the
              edge, drawn differently on each device). appearance-none
              removes the browser's look; the arrow is our own icon. The
              open list stays the device's own, with dark options. */}
          <div className="relative mt-1">
            <select
              id="category-for"
              value={appliesTo}
              onChange={(e) => setAppliesTo(e.target.value as AdminPlaceType)}
              className="block min-h-11 w-full cursor-pointer appearance-none rounded-xl border border-white/45 bg-transparent py-2 pr-10 pl-3 text-base text-white focus:border-white/90 focus:outline-none [&>option]:bg-teal-950 [&>option]:text-white"
            >
              <option value="destination">Destinations (a category)</option>
              <option value="accommodation">Accommodations (a kind)</option>
            </select>
            <ChevronDown
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-white/80"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={busy}
          className="inline-flex min-h-11 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-full bg-white px-5 font-semibold text-teal-900 hover:bg-white/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-default disabled:opacity-60"
        >
          {busy ? <Spinner /> : <Plus aria-hidden="true" className="size-4" />}
          {busy ? "Adding…" : "Add"}
        </button>
      </div>
      {error && (
        <p id="category-name-error" role="alert" className="mt-2 text-sm font-medium text-amber-200">
          {error}
        </p>
      )}
    </form>
  );
}

export function AdminCategories() {
  const categories = useAdminCategories();
  // What the last Add or Delete did; the focus moves to it, so keyboard
  // and screen reader users are told.
  const [done, setDone] = useState<string | null>(null);
  const doneLine = useRef<HTMLParagraphElement>(null);
  const announce = (message: string) => {
    setDone(message);
    requestAnimationFrame(() => doneLine.current?.focus());
  };

  return (
    <section aria-label="Categories and kinds" className={cn(adminGlass, "space-y-4 p-4 sm:p-5")}>
      <p className="text-sm text-white/80">
        Destinations have a category; accommodations have a kind. One that places use cannot be deleted.
      </p>

      {categories.isPending ? (
        <div className="space-y-2">
          <p role="status" className="sr-only">
            Loading categories
          </p>
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
      ) : categories.isError ? (
        <AdminLoadError
          what="the categories"
          error={categories.error}
          onRetry={() => void categories.refetch()}
        />
      ) : (
        <>
          {done && (
            <p
              ref={doneLine}
              tabIndex={-1}
              role="status"
              className="flex items-start gap-2 rounded-xl border border-emerald-300/50 px-4 py-3 text-emerald-100 focus-visible:outline-2 focus-visible:outline-white"
            >
              <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
              {done}
            </p>
          )}
          <div className="grid gap-5 lg:grid-cols-2">
            <CategoryList
              heading="Destination categories"
              categories={categories.data.filter((c) => c.applies_to === "destination")}
              onDone={announce}
            />
            <CategoryList
              heading="Accommodation kinds"
              categories={categories.data.filter((c) => c.applies_to === "accommodation")}
              onDone={announce}
            />
          </div>
          <AddCategory onDone={announce} />
        </>
      )}
    </section>
  );
}

function CategoriesSkeleton() {
  return (
    <div>
      <p role="status" className="sr-only">
        Loading categories
      </p>
      {/* The same shape as the panel while its list loads. */}
      <div className={cn(adminGlass, "space-y-4 p-4 sm:p-5")}>
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    </div>
  );
}

// The page itself (/admin/categories).
export function AdminCategoriesPage() {
  useAdminCategories();
  return (
    <AdminShell title="Categories and kinds" skeleton={<CategoriesSkeleton />}>
      <AdminCategories />
    </AdminShell>
  );
}
