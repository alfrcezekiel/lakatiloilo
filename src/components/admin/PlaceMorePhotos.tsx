"use client";

import { ArrowLeft, ArrowRight, Check, ImagePlus, Plus, Star, Trash2, X } from "lucide-react";
import { useId, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ADMIN_PLACES_KEY } from "@/components/admin/AdminPlaces";
import { ConfirmDeleteDialog } from "@/components/admin/ConfirmDeleteDialog";
import { errorMessage } from "@/components/admin/admin-ui";
import {
  CREDIT_ORDER,
  EMPTY_CREDITS,
  PhotoCreditsField,
  checkCredits,
  creditsOf,
  creditsToSend,
  sameCredits,
  type CreditErrors,
  type Credits,
} from "@/components/admin/PhotoCreditsField";
import { fitPhoto, PHOTO_MESSAGE, PHOTO_TYPES } from "@/lib/shrink-photo";
import { useObjectUrl } from "@/lib/object-url";
import { Spinner } from "@/components/ui/spinner";
import {
  MAX_PLACE_PHOTOS,
  addAdminPlacePhoto,
  deleteAdminPlacePhoto,
  moveAdminPlacePhoto,
  saveAdminPlacePhotoCredits,
  type AdminPlaceDetails,
  type AdminPlacePhoto,
} from "@/lib/api";
import { freshToken } from "@/lib/login";
import { cn } from "@/lib/utils";

// "More photos" on a place's Edit form (admin extras round, ticket 144):
// photos 2 to 6, each with its own credits box and its own Save, and "Add a
// photo" while there is room. Photo 1, the cover, keeps its place at the
// top of the form (the photo, "replace photo" and its credits box). Each
// photo is saved on its own, apart from the form's Save.

const button =
  "inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-default disabled:opacity-60";

// After a save the form shows the saved place everywhere.
function useKeepPlace(place: AdminPlaceDetails) {
  const queryClient = useQueryClient();
  return (saved: AdminPlaceDetails) => {
    queryClient.setQueryData(["admin", "place", place.type, place.id], saved);
    void queryClient.invalidateQueries({ queryKey: ADMIN_PLACES_KEY });
  };
}

// The first credits field with a problem gets the focus.
const focusFirst = (prefix: string, errors: CreditErrors) => {
  const first = CREDIT_ORDER.find((key) => errors[key]);
  if (first) document.getElementById(`${prefix}-${first}`)?.focus();
  return !!first;
};

// One of photos 2 to 6, with its own credits box.
function MorePhoto({ place, photo }: { place: AdminPlaceDetails; photo: AdminPlacePhoto }) {
  const keepPlace = useKeepPlace(place);
  const prefix = `photo-${photo.id}`;
  const [credits, setCredits] = useState<Credits>(() => creditsOf(photo.credits));
  const [errors, setErrors] = useState<CreditErrors>({});
  const [busy, setBusy] = useState(false);
  const [line, setLine] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const changed = !sameCredits(credits, creditsOf(photo.credits)) || !!photo.credits?.photo_changed;

  const save = async () => {
    const found = checkCredits(credits);
    setErrors(found);
    setLine(null);
    setFailure(null);
    if (focusFirst(prefix, found)) return;
    setBusy(true);
    try {
      const token = await freshToken();
      if (!token) throw new Error("Please log in again, then try again.");
      const saved = await saveAdminPlacePhotoCredits(token, place.type, place.id, photo.id, creditsToSend(credits));
      keepPlace(saved);
      setLine(`Photo ${photo.position}'s credits saved.`);
    } catch (e) {
      setFailure(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className="space-y-3 rounded-2xl border border-white/20 p-3 sm:p-4">
      <div className="flex flex-wrap items-center gap-3">
        <img
          src={photo.photo_url}
          alt={`Photo ${photo.position} of ${place.name}`}
          className="h-24 w-40 max-w-full rounded-xl border border-white/25 object-cover"
        />
        <p className="text-sm font-semibold">Photo {photo.position}</p>
      </div>
      <PhotoCreditsField
        credits={credits}
        onChange={(next, key) => {
          setCredits(next);
          setLine(null);
          if (errors[key]) setErrors((current) => ({ ...current, [key]: undefined }));
        }}
        errors={errors}
        photoChanged={!!photo.credits?.photo_changed}
        busy={busy}
        idPrefix={prefix}
        legend={`Photo ${photo.position}: credits and copyright`}
      />
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void save()}
          disabled={busy || !changed}
          className={cn(button, "bg-white text-teal-900 hover:bg-white/90")}
        >
          {busy ? <Spinner /> : <Check aria-hidden="true" className="size-4" />}
          {busy ? "Saving…" : `Save photo ${photo.position}'s credits`}
        </button>
        {line && (
          <p role="status" className="text-sm text-emerald-100">
            {line}
          </p>
        )}
      </div>
      {failure && (
        <p role="alert" className="text-sm font-medium text-amber-200">
          {failure}
        </p>
      )}
    </li>
  );
}

// "Add a photo": a file from the computer and its credits, saved together.
function AddPhoto({ place, count }: { place: AdminPlaceDetails; count: number }) {
  const keepPlace = useKeepPlace(place);
  const inputId = useId();
  const prefix = `new-photo-${place.id}`;
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [credits, setCredits] = useState<Credits>(EMPTY_CREDITS);
  const [errors, setErrors] = useState<CreditErrors>({});
  const [busy, setBusy] = useState(false);
  const [line, setLine] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const preview = useObjectUrl(file);

  // True while a photo over 2 MB is being made smaller (team request
  // 2026-11-22, src/lib/shrink-photo.ts).
  const [preparing, setPreparing] = useState(false);
  const choose = async (chosen: File | undefined) => {
    if (!chosen) return;
    if (input.current) input.current.value = "";
    setFileError(null);
    setPreparing(true);
    const fitted = await fitPhoto(chosen);
    setPreparing(false);
    if (fitted) {
      setFile(fitted);
      setLine(null);
    } else {
      setFileError(PHOTO_MESSAGE);
    }
  };

  const add = async () => {
    setLine(null);
    setFailure(null);
    if (!file) {
      setFileError("Please choose a photo first (JPG, PNG or WebP, up to 2 MB).");
      input.current?.focus();
      return;
    }
    const found = checkCredits(credits);
    setErrors(found);
    if (focusFirst(prefix, found)) return;
    setBusy(true);
    try {
      const token = await freshToken();
      if (!token) throw new Error("Please log in again, then try again.");
      const saved = await addAdminPlacePhoto(token, place.type, place.id, file, creditsToSend(credits));
      keepPlace(saved);
      setFile(null);
      setCredits(EMPTY_CREDITS);
      setErrors({});
      setLine(`Photo ${count + 1} added.`);
    } catch (e) {
      setFailure(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3 rounded-2xl border border-dashed border-white/35 p-3 sm:p-4">
      <p className="text-sm font-semibold">
        Add a photo ({count} of {MAX_PLACE_PHOTOS})
      </p>
      <div className="flex flex-wrap items-end gap-3">
        {preview && (
          <img
            src={preview}
            alt="Preview of the photo you chose"
            className="h-24 w-40 max-w-full rounded-xl border border-amber-300/70 object-cover"
          />
        )}
        <input
          ref={input}
          id={inputId}
          type="file"
          accept={PHOTO_TYPES.join(",")}
          className="sr-only"
          disabled={busy || preparing}
          aria-invalid={!!fileError}
          aria-describedby={`${inputId}-help`}
          onChange={(e) => void choose(e.target.files?.[0])}
        />
        <label
          htmlFor={inputId}
          className={cn(
            "inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-white/50 px-4 text-sm font-semibold hover:border-amber-300 hover:text-amber-300 has-focus-visible:outline-2 has-focus-visible:outline-white",
            busy && "pointer-events-none opacity-60",
          )}
        >
          <ImagePlus aria-hidden="true" className="size-4" />
          {file ? "Choose another photo" : "Choose a photo"}
        </label>
        {file && (
          <button
            type="button"
            onClick={() => setFile(null)}
            disabled={busy}
            className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-white/40 px-4 text-sm font-semibold hover:border-amber-300 hover:text-amber-300 focus-visible:outline-2 focus-visible:outline-white"
          >
            <X aria-hidden="true" className="size-4" />
            Remove
          </button>
        )}
      </div>
      <p
        id={`${inputId}-help`}
        role={preparing ? "status" : undefined}
        className={cn("text-xs", fileError && !preparing ? "text-amber-200" : "text-white/70")}
      >
        {preparing
          ? "Making your photo smaller…"
          : (fileError ?? "JPG, PNG or WebP from your computer; over 2 MB is made smaller for you.")}
      </p>
      <PhotoCreditsField
        credits={credits}
        onChange={(next, key) => {
          setCredits(next);
          if (errors[key]) setErrors((current) => ({ ...current, [key]: undefined }));
        }}
        errors={errors}
        photoChanged={false}
        busy={busy}
        idPrefix={prefix}
        legend="Its credits and copyright"
      />
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => void add()} disabled={busy} className={cn(button, "bg-white text-teal-900 hover:bg-white/90")}>
          {busy ? <Spinner /> : <Plus aria-hidden="true" className="size-4" />}
          {busy ? "Adding and uploading…" : "Add photo"}
        </button>
        {line && (
          <p role="status" className="text-sm text-emerald-100">
            {line}
          </p>
        )}
      </div>
      {failure && (
        <p role="alert" className="text-sm font-medium text-amber-200">
          {failure}
        </p>
      )}
    </div>
  );
}

const smallButton =
  "inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center gap-1.5 rounded-xl border px-2 text-xs font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-default disabled:opacity-40 sm:text-sm";

// "Order and cover" (ticket 145): every photo in order, each with ← and →
// to move it, "Make it the cover" and Delete (a pop-up first; the last
// photo cannot go). Photo 1 is the cover the cards show.
function PhotoOrder({ place }: { place: AdminPlaceDetails }) {
  const keepPlace = useKeepPlace(place);
  const photos = place.photos ?? [];
  const [busyId, setBusyId] = useState<string | null>(null);
  const [line, setLine] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<AdminPlacePhoto | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const run = async (photo: AdminPlacePhoto, work: (token: string) => Promise<AdminPlaceDetails>, done: string) => {
    setBusyId(photo.id);
    setLine(null);
    setFailure(null);
    try {
      const token = await freshToken();
      if (!token) throw new Error("Please log in again, then try again.");
      keepPlace(await work(token));
      setLine(done);
      return null;
    } catch (e) {
      // Shown under the list, or in the pop-up for a delete.
      const message = errorMessage(e);
      setFailure(message);
      return message;
    } finally {
      setBusyId(null);
    }
  };

  const move = (photo: AdminPlacePhoto, position: number, done: string) =>
    void run(photo, (token) => moveAdminPlacePhoto(token, place.type, place.id, photo.id, position), done);

  const remove = async () => {
    if (!deleting) return;
    setDeleteError(null);
    const removed = deleting;
    const error = await run(
      removed,
      (token) => deleteAdminPlacePhoto(token, place.type, place.id, removed.id),
      `Photo ${removed.position} deleted, with its credits.`,
    );
    if (error) setDeleteError(error);
    else setDeleting(null);
  };

  if (photos.length === 0) return null;
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold">Order and cover</h4>
      <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {photos.map((photo) => {
          const busy = busyId === photo.id;
          const cover = photo.position === 1;
          return (
            <li key={photo.id} className="space-y-2 rounded-xl border border-white/20 p-2">
              <div className="flex items-center gap-2">
                <img
                  src={photo.photo_url}
                  alt={`Photo ${photo.position} of ${place.name}`}
                  className="h-14 w-20 shrink-0 rounded-lg border border-white/25 object-cover"
                />
                <p className="text-sm font-semibold">
                  Photo {photo.position}
                  {cover && (
                    <span className="mt-0.5 flex items-center gap-1 text-xs text-amber-200">
                      <Star aria-hidden="true" className="size-3.5 shrink-0" />
                      Cover
                    </span>
                  )}
                </p>
                {busy && <Spinner />}
              </div>
              {/* Phones: four equal buttons in a row (frontend rules). */}
              <div className="grid grid-cols-4 gap-1.5">
                <button
                  type="button"
                  onClick={() => move(photo, photo.position - 1, `Photo ${photo.position} moved earlier.`)}
                  disabled={busyId !== null || photo.position === 1}
                  aria-label={`Move photo ${photo.position} earlier`}
                  className={cn(smallButton, "border-white/40 hover:border-amber-300 hover:text-amber-300")}
                >
                  <ArrowLeft aria-hidden="true" className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => move(photo, photo.position + 1, `Photo ${photo.position} moved later.`)}
                  disabled={busyId !== null || photo.position === photos.length}
                  aria-label={`Move photo ${photo.position} later`}
                  className={cn(smallButton, "border-white/40 hover:border-amber-300 hover:text-amber-300")}
                >
                  <ArrowRight aria-hidden="true" className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => move(photo, 1, `Photo ${photo.position} is now the cover.`)}
                  disabled={busyId !== null || cover}
                  aria-label={`Make photo ${photo.position} the cover`}
                  title="Make it the cover"
                  className={cn(smallButton, "border-amber-300/70 text-amber-200 hover:border-amber-200 hover:text-white")}
                >
                  <Star aria-hidden="true" className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDeleteError(null);
                    setDeleting(photo);
                  }}
                  disabled={busyId !== null || photos.length === 1}
                  aria-label={`Delete photo ${photo.position}`}
                  className={cn(smallButton, "border-red-300/70 text-red-200 hover:border-red-200 hover:text-white")}
                >
                  <Trash2 aria-hidden="true" className="size-4" />
                </button>
              </div>
            </li>
          );
        })}
      </ol>
      <p className="text-xs text-white/70">
        ← → move a photo, ★ makes it the cover, the bin deletes it. Moving the cover reloads the form above, so
        save your other changes there first.
      </p>
      {line && (
        <p role="status" className="text-sm text-emerald-100">
          {line}
        </p>
      )}
      {failure && !deleting && (
        <p role="alert" className="text-sm font-medium text-amber-200">
          {failure}
        </p>
      )}
      <ConfirmDeleteDialog
        open={!!deleting}
        title={deleting ? `Delete photo ${deleting.position}?` : "Delete this photo?"}
        message={
          deleting?.position === 1
            ? "It is the cover: photo 2 becomes the cover. Its credits are deleted too. This cannot be undone."
            : "Its credits are deleted too. This cannot be undone."
        }
        busy={busyId !== null}
        error={deleteError}
        onConfirm={() => void remove()}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}

export function PlaceMorePhotos({ place }: { place: AdminPlaceDetails }) {
  const photos = place.photos ?? [];
  const more = photos.filter((photo) => photo.position > 1);
  return (
    <section aria-labelledby={`more-photos-${place.id}`} className="space-y-3">
      <div>
        <h3 id={`more-photos-${place.id}`} className="text-sm font-semibold">
          More photos
        </h3>
        <p className="text-sm text-white/80">
          Up to {MAX_PLACE_PHOTOS} photos in all, each with its own credits. Photo 1, above, is the cover the
          cards show.
        </p>
      </div>
      <PhotoOrder place={place} />
      {more.length > 0 && (
        <ul className="space-y-3">
          {more.map((photo) => (
            // Keyed by its saved credits too, so the box starts over after
            // a save elsewhere changed them.
            <MorePhoto key={`${photo.id}:${photo.credits?.updated_at ?? ""}`} place={place} photo={photo} />
          ))}
        </ul>
      )}
      {photos.length < MAX_PLACE_PHOTOS ? (
        <AddPhoto place={place} count={photos.length} />
      ) : (
        <p className="text-sm text-white/75">This place has {MAX_PLACE_PHOTOS} photos, the most it can have.</p>
      )}
    </section>
  );
}
