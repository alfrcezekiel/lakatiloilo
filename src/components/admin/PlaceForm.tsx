"use client";

import { Check, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { adminGlass } from "@/components/admin/AdminFrame";
import { ADMIN_CATEGORIES_KEY } from "@/components/admin/AdminCategories";
import { ADMIN_PLACES_KEY } from "@/components/admin/AdminPlaces";
import { errorMessage } from "@/components/admin/admin-ui";
import { GlassField, fieldInputClass } from "@/components/GlassField";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import {
  createAdminPlace,
  getCategories,
  ILOILO,
  PLACE_LIMITS,
  replaceAdminPlacePhoto,
  saveAdminPlaceCredits,
  updateAdminPlace,
  type AdminPlaceDetails,
  type AdminPlaceType,
} from "@/lib/api";
import { locationLabels } from "@/lib/labels";
import { PlacePhotoField } from "@/components/admin/PlacePhotoField";
import {
  CREDIT_ORDER,
  PhotoCreditsField,
  checkCredits,
  creditsOf,
  creditsToSend,
  sameCredits,
  type CreditErrors,
  type Credits,
} from "@/components/admin/PhotoCreditsField";
import {
  EMPTY_FIELDS,
  FIELD_ORDER,
  check,
  fieldsOf,
  type FieldErrors,
  type Fields,
} from "@/components/admin/place-form-fields";
import { freshToken } from "@/lib/login";
import { cn } from "@/lib/utils";

// The place form (PlaceForm.tsx since 2026-11-11; the Edit page that
// loads the place is AdminPlaceEdit.tsx).
//
// Editing one place (/admin/places/<destination|accommodation>/<id>,
// ticket 112): name, description and address, plus phone and email for an
// accommodation; since ticket 118 also the category (destination) or kind
// (accommodation), Iloilo City or Province, and the latitude and
// longitude. Save sends the changes to the backend, which saves them as
// the admin (the database allows only these columns, supabase/sql/043 and
// 048, and checks the category and the position itself). Since ticket 119
// the photo too: "Choose a photo" picks a file from the computer (JPG, PNG
// or WebP up to 2 MB), shows it before saving, and Save uploads it after
// the other changes;
// open place pages show the change at once (Realtime, 029). Cancel goes
// back to the list and changes nothing.
//
// Since ticket 120 the same form adds a new place (/admin/places/new):
// it starts empty, with Destination or Accommodation to choose, and a
// photo is required. The backend uploads the photo first and then adds
// the place, so a new place never shows on the site without its photo.

// A <select> inside a glass field: no box of its own, and a dark list so
// the options stay readable.
const fieldSelectClass =
  "block w-full cursor-pointer bg-transparent py-0.5 text-base text-white focus:outline-none [&>option]:bg-teal-950 [&>option]:text-white";

const PLACE_TYPES: { id: AdminPlaceType; label: string }[] = [
  { id: "destination", label: "Destination" },
  { id: "accommodation", label: "Accommodation" },
];

const NEW_PHOTO_MESSAGE = "Please choose a photo of the place (JPG, PNG or WebP, up to 2 MB).";

// Edits `place`, or adds a new place when there is none (ticket 120);
// onAdded gets the new place.
export function PlaceForm({
  place,
  onAdded,
}: {
  place?: AdminPlaceDetails;
  onAdded?: (added: AdminPlaceDetails) => void;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const adding = !place;
  const [type, setType] = useState<AdminPlaceType>(place?.type ?? "destination");
  const isStay = type === "accommodation";
  const [fields, setFields] = useState<Fields>(() => (place ? fieldsOf(place) : EMPTY_FIELDS));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const savedLine = useRef<HTMLParagraphElement>(null);
  // A new photo chosen from the computer (ticket 119), not uploaded yet,
  // and a message for a wrong file.
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const photoInput = useRef<HTMLInputElement>(null);
  // The photo's credits and copyright (ticket 132), on Edit.
  const [credits, setCredits] = useState<Credits>(() => creditsOf(place?.credits ?? null));
  const [creditErrors, setCreditErrors] = useState<CreditErrors>({});

  // The categories (destination) or kinds (accommodation) to choose from,
  // from the team's list (ticket 116). The place's own one is always in
  // the list, even while the list is still loading.
  const categories = useQuery({ queryKey: ["categories"], queryFn: getCategories });
  const choices = (categories.data ?? []).filter((c) => c.applies_to === type);
  const kindChoices =
    !place || choices.some((c) => c.id === place.kind)
      ? choices
      : [{ id: place.kind, name: place.kind, applies_to: place.type }, ...choices];

  const placeHref = place ? `/${isStay ? "accommodations" : "destinations"}/${place.id}` : "";
  const fieldsUnchanged =
    !!place && FIELD_ORDER.every((key) => fields[key].trim() === fieldsOf(place)[key].trim());
  // Credits are saved when they changed, or to confirm them after the
  // photo was replaced ("Check these credits").
  const saveCredits =
    !!place && (!sameCredits(credits, creditsOf(place.credits)) || !!place.credits?.photo_changed);
  const unchanged = fieldsUnchanged && !photo && !saveCredits;

  // Switching between Destination and Accommodation (adding only): the
  // category list changes, so the chosen one is cleared.
  const chooseType = (next: AdminPlaceType) => {
    if (next === type) return;
    setType(next);
    setFields((current) => ({ ...current, kind: "" }));
    setErrors((current) => ({ ...current, kind: undefined, phone: undefined, email: undefined }));
  };

  const set = (key: keyof Fields) => (value: string) => {
    setFields((current) => ({ ...current, [key]: value }));
    setSaved(false);
    if (errors[key]) setErrors((current) => ({ ...current, [key]: undefined }));
  };

  // Error ids for aria-describedby: GlassField shows "<id>-error" or
  // "<id>-hint" under the box.
  const describedBy = (key: keyof Fields, hint = false) =>
    errors[key] ? `place-${key}-error` : hint ? `place-${key}-hint` : undefined;

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    const found = check(fields, isStay);
    setErrors(found);
    setFailure(null);
    // Credits are required for a new place (ticket 133), and on Edit
    // checked when they are being saved.
    const foundCredits = adding || saveCredits ? checkCredits(credits) : {};
    setCreditErrors(foundCredits);
    // A new place needs a photo; the photo is the first thing on the form
    // (every other message is shown too, so the admin sees them all).
    if (adding && !photo) {
      setPhotoError(NEW_PHOTO_MESSAGE);
      photoInput.current?.focus();
      return;
    }
    // The credits box comes right after the photo, so its fields first.
    const firstCredit = CREDIT_ORDER.find((key) => foundCredits[key]);
    if (firstCredit) {
      document.getElementById(`credit-${firstCredit}`)?.focus();
      return;
    }
    const first = FIELD_ORDER.find((key) => found[key]);
    if (first) {
      document.getElementById(`place-${first}`)?.focus();
      return;
    }
    setBusy(true);
    try {
      const token = await freshToken();
      if (!token) throw new Error("Please log in again, then try again.");
      const changes = {
        name: fields.name.trim(),
        description: fields.description.trim(),
        address: fields.address.trim(),
        kind: fields.kind,
        location_type: fields.location_type,
        latitude: Number(fields.latitude),
        longitude: Number(fields.longitude),
        ...(isStay ? { phone: fields.phone.trim(), email: fields.email.trim() } : {}),
      };
      if (!place) {
        // Adding (ticket 120): the place, its photo and (ticket 133) its
        // credits in one request; nothing is kept if any is refused.
        const added = await createAdminPlace(token, type, changes, photo!, creditsToSend(credits));
        queryClient.setQueryData(["admin", "place", added.type, added.id], added);
        void queryClient.invalidateQueries({ queryKey: ADMIN_PLACES_KEY });
        // The "places using it" counts under the list change too.
        void queryClient.invalidateQueries({ queryKey: ADMIN_CATEGORIES_KEY });
        onAdded?.(added);
        return;
      }
      // The fields first (only when they changed), then the photo.
      let updated = fieldsUnchanged ? place : await updateAdminPlace(token, place.type, place.id, changes);
      if (photo) {
        updated = await replaceAdminPlacePhoto(token, place.type, place.id, photo);
        setPhoto(null);
      }
      // Then the credits, so they are saved for the photo as it is now.
      if (saveCredits) {
        updated = await saveAdminPlaceCredits(token, place.type, place.id, creditsToSend(credits));
      }
      queryClient.setQueryData(["admin", "place", place.type, place.id], updated);
      void queryClient.invalidateQueries({ queryKey: ADMIN_PLACES_KEY });
      void queryClient.invalidateQueries({ queryKey: ADMIN_CATEGORIES_KEY });
      setFields(fieldsOf(updated));
      setCredits(creditsOf(updated.credits));
      setSaved(true);
      requestAnimationFrame(() => savedLine.current?.focus());
    } catch (e) {
      setFailure(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={save} noValidate className={cn(adminGlass, "space-y-4 p-5 sm:p-8")}>
      <div>
        {place ? (
          <>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/75">
              {isStay ? "Accommodation" : "Destination"}
            </p>
            <h2 className="font-fraunces mt-1 text-2xl font-medium wrap-break-word">{place.name}</h2>
            <p className="mt-1 text-sm text-white/80">Changes show on the site as soon as you save.</p>
          </>
        ) : (
          <>
            <h2 className="font-fraunces text-2xl font-medium">Add a place</h2>
            <p className="mt-1 text-sm text-white/80">
              Every field except phone, email, publisher and original photo URL is needed. The place
              shows on the site as soon as you add it.
            </p>
          </>
        )}
      </div>

      {/* Destination or Accommodation (adding only). */}
      {adding && (
        <div role="group" aria-label="Kind of place" className="flex flex-wrap gap-2">
          {PLACE_TYPES.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => chooseType(id)}
              aria-pressed={type === id}
              disabled={busy}
              className={cn(
                "min-h-11 cursor-pointer rounded-full border px-4 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-default",
                type === id ? "border-white bg-white text-teal-900" : "border-white/40 text-white/85 hover:text-white",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* The photo (ticket 119): the current one, or the new one chosen
          from the computer. */}
      <PlacePhotoField
        photo={photo}
        onPhoto={(file) => {
          setPhoto(file);
          setSaved(false);
        }}
        error={photoError}
        onError={setPhotoError}
        currentUrl={place?.photo_url ?? null}
        placeName={place?.name ?? "the place"}
        adding={adding}
        busy={busy}
        inputRef={photoInput}
      />

      {/* The photo's credits and copyright (tickets 132, 133). */}
      <PhotoCreditsField
        credits={credits}
        onChange={(next, key) => {
          setCredits(next);
          setSaved(false);
          if (creditErrors[key]) setCreditErrors((current) => ({ ...current, [key]: undefined }));
        }}
        errors={creditErrors}
        photoChanged={!!place?.credits && (place.credits.photo_changed || !!photo)}
        busy={busy}
      />

      <GlassField id="place-name" label="Name" error={errors.name}>
        <Input
          id="place-name"
          value={fields.name}
          onChange={(e) => set("name")(e.target.value)}
          maxLength={PLACE_LIMITS.name + 20}
          aria-invalid={!!errors.name}
          aria-describedby={describedBy("name")}
          className={fieldInputClass}
        />
      </GlassField>

      <GlassField
        id="place-description"
        label="Description"
        hint={`${fields.description.trim().length} of ${PLACE_LIMITS.description} characters`}
        error={errors.description}
      >
        <Textarea
          id="place-description"
          value={fields.description}
          onChange={(e) => set("description")(e.target.value)}
          rows={6}
          aria-invalid={!!errors.description}
          aria-describedby={describedBy("description", true)}
          className={cn(fieldInputClass, "min-h-36 resize-y")}
        />
      </GlassField>

      <GlassField id="place-address" label="Address" error={errors.address}>
        <Input
          id="place-address"
          value={fields.address}
          onChange={(e) => set("address")(e.target.value)}
          autoComplete="off"
          aria-invalid={!!errors.address}
          aria-describedby={describedBy("address")}
          className={fieldInputClass}
        />
      </GlassField>

      <div className="grid gap-4 sm:grid-cols-2">
        <GlassField id="place-kind" label={isStay ? "Kind" : "Category"} error={errors.kind}>
          <select
            id="place-kind"
            value={fields.kind}
            onChange={(e) => set("kind")(e.target.value)}
            aria-invalid={!!errors.kind}
            aria-describedby={describedBy("kind")}
            className={fieldSelectClass}
          >
            {!fields.kind && (
              <option value="" disabled>
                {isStay ? "Choose a kind" : "Choose a category"}
              </option>
            )}
            {kindChoices.map((choice) => (
              <option key={choice.id} value={choice.id}>
                {choice.name}
              </option>
            ))}
          </select>
        </GlassField>
        <GlassField id="place-location_type" label="Location" error={errors.location_type}>
          <select
            id="place-location_type"
            value={fields.location_type}
            onChange={(e) => set("location_type")(e.target.value)}
            aria-invalid={!!errors.location_type}
            aria-describedby={describedBy("location_type")}
            className={fieldSelectClass}
          >
            {!fields.location_type && (
              <option value="" disabled>
                Choose City or Province
              </option>
            )}
            {Object.entries(locationLabels).map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </GlassField>
        <GlassField
          id="place-latitude"
          label="Latitude"
          hint={`${ILOILO.latitude[0]} to ${ILOILO.latitude[1]}, for example 10.7202`}
          error={errors.latitude}
        >
          <Input
            id="place-latitude"
            inputMode="decimal"
            value={fields.latitude}
            onChange={(e) => set("latitude")(e.target.value)}
            autoComplete="off"
            aria-invalid={!!errors.latitude}
            aria-describedby={describedBy("latitude", true)}
            className={fieldInputClass}
          />
        </GlassField>
        <GlassField
          id="place-longitude"
          label="Longitude"
          hint={`${ILOILO.longitude[0]} to ${ILOILO.longitude[1]}, for example 122.5621`}
          error={errors.longitude}
        >
          <Input
            id="place-longitude"
            inputMode="decimal"
            value={fields.longitude}
            onChange={(e) => set("longitude")(e.target.value)}
            autoComplete="off"
            aria-invalid={!!errors.longitude}
            aria-describedby={describedBy("longitude", true)}
            className={fieldInputClass}
          />
        </GlassField>
      </div>

      {isStay && (
        <div className="grid gap-4 sm:grid-cols-2">
          <GlassField id="place-phone" label="Phone" hint="Optional" error={errors.phone}>
            <Input
              id="place-phone"
              type="tel"
              value={fields.phone}
              onChange={(e) => set("phone")(e.target.value)}
              autoComplete="off"
              aria-invalid={!!errors.phone}
              aria-describedby={describedBy("phone", true)}
              className={fieldInputClass}
            />
          </GlassField>
          <GlassField id="place-email" label="Email" hint="Optional" error={errors.email}>
            <Input
              id="place-email"
              type="email"
              value={fields.email}
              onChange={(e) => set("email")(e.target.value)}
              autoComplete="off"
              aria-invalid={!!errors.email}
              aria-describedby={describedBy("email", true)}
              className={fieldInputClass}
            />
          </GlassField>
        </div>
      )}

      {failure && (
        <p role="alert" className="text-sm font-medium text-amber-200">
          {failure}
        </p>
      )}
      {saved && (
        <p
          ref={savedLine}
          tabIndex={-1}
          role="status"
          className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-emerald-300/50 px-4 py-3 text-emerald-100 focus-visible:outline-2 focus-visible:outline-white"
        >
          <span className="flex items-center gap-2">
            <Check aria-hidden="true" className="size-4 shrink-0" />
            Saved. The change shows on the site now.
          </span>
          <Link
            href={placeHref}
            className="inline-flex items-center gap-1 font-semibold text-amber-200 underline-offset-4 hover:text-amber-300 hover:underline focus-visible:outline-2 focus-visible:outline-white"
          >
            View the place page
            <ExternalLink aria-hidden="true" className="size-3.5" />
          </Link>
        </p>
      )}

      <div className="flex flex-wrap gap-3 pt-2">
        <button
          type="submit"
          disabled={busy || unchanged}
          className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-full bg-white px-6 font-semibold text-teal-900 hover:bg-white/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-default disabled:opacity-60"
        >
          {busy && <Spinner />}
          {adding
            ? busy
              ? "Adding and uploading…"
              : "Add place"
            : busy
              ? photo
                ? "Saving and uploading…"
                : "Saving…"
              : "Save"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin/places")}
          disabled={busy}
          className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-full border border-white/50 px-6 font-semibold hover:border-amber-300 hover:text-amber-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-default disabled:opacity-60"
        >
          Cancel
        </button>
      </div>
      {!adding && unchanged && !saved && (
        <p className="text-xs text-white/70">Save turns on once something has changed.</p>
      )}
    </form>
  );
}
