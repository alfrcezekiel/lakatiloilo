"use client";

import { Check, ChevronDown, Pencil, Plus, Trash2 } from "lucide-react";
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
  updateAdminCategory,
  type AdminPlaceType,
  type PlaceCategoryWithCount,
} from "@/lib/api";
import { useAdminPlaces } from "@/components/admin/AdminPlaces";
import { BUILT_IN_ICONS, CATEGORY_ICONS, iconFor } from "@/lib/category-icons";
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
  // Edit (admin extras round, ticket 141): a new name. Its id, which places
  // point at, stays, so no place changes.
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(category.name);
  // Its card's icon and photo (ticket 142); "" = the default.
  const [icon, setIcon] = useState(category.icon ?? "");
  const [photoPlace, setPhotoPlace] = useState(category.photo_place_id ?? "");
  const builtIn = category.id in BUILT_IN_ICONS;
  // Its own places with a photo, for the photo picker (the dashboard sees
  // every photo, allowed or not; a not-allowed one shows the splash art).
  const places = useAdminPlaces();
  const ownPlaces = (places.data ?? []).filter((p) => p.kind === category.id && p.photo_url);
  const DefaultIcon = iconFor(category.id, null, category.applies_to);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const editButton = useRef<HTMLButtonElement>(null);
  const nameId = useId();

  const closeEdit = () => {
    setEditing(false);
    setEditError(null);
    requestAnimationFrame(() => editButton.current?.focus());
  };

  const rename = async (event: React.FormEvent) => {
    event.preventDefault();
    const name = draft.trim().replace(/\s+/g, " ");
    if (name.length < CATEGORY_NAME.min || name.length > CATEGORY_NAME.max) {
      setEditError(`Please write a name of ${CATEGORY_NAME.min} to ${CATEGORY_NAME.max} characters.`);
      return;
    }
    // Only what changed is sent.
    const changes: { name?: string; icon?: string | null; photo_place_id?: string | null } = {};
    if (name !== category.name) changes.name = name;
    if (icon !== (category.icon ?? "")) changes.icon = icon || null;
    if (photoPlace !== (category.photo_place_id ?? "")) changes.photo_place_id = photoPlace || null;
    if (Object.keys(changes).length === 0) {
      closeEdit();
      return;
    }
    setSaving(true);
    setEditError(null);
    try {
      const token = await freshToken();
      if (!token) throw new Error("Please log in again, then try again.");
      const saved = await updateAdminCategory(token, category.id, changes);
      queryClient.setQueryData<PlaceCategoryWithCount[]>(ADMIN_CATEGORIES_KEY, (list) =>
        list?.map((c) => (c.id === saved.id ? saved : c)),
      );
      void queryClient.invalidateQueries({ queryKey: ADMIN_CATEGORIES_KEY });
      // The place form's Category / Kind list uses the public list.
      void queryClient.invalidateQueries({ queryKey: ["categories"] });
      onDone(
        changes.name
          ? `"${category.name}" is now "${saved.name}". The site shows the change.`
          : `"${saved.name}" saved. The site shows the change.`,
      );
      closeEdit();
    } catch (e) {
      setEditError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

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
        {!editing && !confirming && (
          <button
            ref={editButton}
            type="button"
            onClick={() => {
              setDraft(category.name);
              setIcon(category.icon ?? "");
              setPhotoPlace(category.photo_place_id ?? "");
              setEditing(true);
            }}
            aria-label={`Edit ${category.name}`}
            className={cn(smallButton, "border-white/40 hover:border-amber-300 hover:text-amber-300")}
          >
            <Pencil aria-hidden="true" className="size-4" />
            Edit
          </button>
        )}
        {editing ? null : inUse ? (
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
      {editing && (
        <form
          onSubmit={(event) => void rename(event)}
          onKeyDown={(event) => {
            if (event.key === "Escape" && !saving) closeEdit();
          }}
          noValidate
          className="mt-2 space-y-2"
        >
          <label htmlFor={nameId} className="block text-sm font-semibold text-white/85">
            New name
          </label>
          <input
            id={nameId}
            autoFocus
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value);
              setEditError(null);
            }}
            maxLength={CATEGORY_NAME.max + 10}
            aria-invalid={!!editError}
            aria-describedby={editError ? `${nameId}-error` : `${nameId}-hint`}
            className="block min-h-11 w-full rounded-xl border border-white/45 bg-transparent px-3 text-base text-white focus:border-white/90 focus:outline-none"
          />
          {editError ? (
            <p id={`${nameId}-error`} role="alert" className="text-sm font-medium text-amber-200">
              {editError}
            </p>
          ) : (
            <p id={`${nameId}-hint`} className="text-xs text-white/70">
              {CATEGORY_NAME.min} to {CATEGORY_NAME.max} characters. Places keep it; only the name changes.
            </p>
          )}
          {/* The card's icon (ticket 142): the default, then the 16 choices.
              Real radio buttons: arrow keys move between them. */}
          <fieldset className="pt-1">
            <legend className="text-sm font-semibold text-white/85">Icon on its card</legend>
            <div className="mt-1.5 grid grid-cols-3 gap-2 sm:grid-cols-6">
              {[{ id: "", label: "Default", Icon: DefaultIcon }, ...CATEGORY_ICONS].map(({ id, label, Icon }) => (
                <label
                  key={id || "default"}
                  className={cn(
                    "flex min-h-14 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border px-1 py-2 text-center text-xs font-semibold has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-white",
                    icon === id ? "border-amber-300 text-amber-200" : "border-white/30 text-white/85 hover:border-white/60",
                  )}
                >
                  <input
                    type="radio"
                    name={`${nameId}-icon`}
                    value={id}
                    checked={icon === id}
                    onChange={() => setIcon(id)}
                    className="sr-only"
                  />
                  <Icon aria-hidden="true" className="size-5 shrink-0" />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>
          {/* The card's photo (ticket 142): one of its own places' photos,
              which already have their credits; never a new upload. */}
          <fieldset className="pt-1">
            <legend className="text-sm font-semibold text-white/85">Photo on its card</legend>
            <div className="mt-1.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <label
                className={cn(
                  "flex min-h-24 cursor-pointer items-center justify-center rounded-xl border px-2 py-2 text-center text-xs font-semibold has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-white",
                  photoPlace === "" ? "border-amber-300 text-amber-200" : "border-white/30 text-white/85 hover:border-white/60",
                )}
              >
                <input
                  type="radio"
                  name={`${nameId}-photo`}
                  value=""
                  checked={photoPlace === ""}
                  onChange={() => setPhotoPlace("")}
                  className="sr-only"
                />
                {builtIn ? "Its own photo (as now)" : "Its first place's photo (as now)"}
              </label>
              {ownPlaces.map((place) => (
                <label
                  key={place.id}
                  className={cn(
                    "flex cursor-pointer flex-col gap-1 rounded-xl border p-1.5 text-xs font-semibold has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-white",
                    photoPlace === place.id ? "border-amber-300 text-amber-200" : "border-white/30 text-white/85 hover:border-white/60",
                  )}
                >
                  <input
                    type="radio"
                    name={`${nameId}-photo`}
                    value={place.id}
                    checked={photoPlace === place.id}
                    onChange={() => setPhotoPlace(place.id)}
                    className="sr-only"
                  />
                  <img src={place.photo_url ?? ""} alt="" className="aspect-video w-full rounded-lg object-cover" />
                  <span className="line-clamp-2 wrap-break-word">{place.name}</span>
                </label>
              ))}
            </div>
            {places.isPending ? (
              <p className="mt-1 text-xs text-white/70">Loading its places&apos; photos…</p>
            ) : ownPlaces.length === 0 ? (
              <p className="mt-1 text-xs text-white/70">No place in it has a photo yet.</p>
            ) : (
              <p className="mt-1 text-xs text-white/70">
                A photo whose credits are not allowed yet shows the splash art to travelers.
              </p>
            )}
          </fieldset>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <button
              type="submit"
              disabled={saving}
              className={cn(smallButton, "border-white bg-white text-teal-900 hover:bg-white/90")}
            >
              {saving ? <Spinner /> : <Check aria-hidden="true" className="size-4" />}
              {saving ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={closeEdit}
              disabled={saving}
              className={cn(smallButton, "border-white/40 hover:border-amber-300 hover:text-amber-300")}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
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
      {/* Level 2: right under the page title since Categories has its own
          page (evaluation 2026-11-12, WCAG 1.3.1). */}
      <h2 id={headingId} className="text-sm font-semibold text-white/90">
        {heading} ({categories.length})
      </h2>
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
