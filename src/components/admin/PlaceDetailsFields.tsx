"use client";

import { GlassField, fieldInputClass } from "@/components/GlassField";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ILOILO, PLACE_LIMITS, type PlaceCategory } from "@/lib/api";
import { locationLabels } from "@/lib/labels";
import type { FieldErrors, Fields } from "@/components/admin/place-form-fields";
import { cn } from "@/lib/utils";

// The place's own fields on the place form (Edit, ticket 112; every field
// since 118; Add, 120): name, description, address, category or kind,
// Iloilo City or Province, latitude and longitude, and an accommodation's
// phone and email. Moved out of PlaceForm.tsx in the code review of
// 2026-11-12; the form keeps the values, the checks and Save.

// A <select> inside a glass field: no box of its own, and a dark list so
// the options stay readable.
const fieldSelectClass =
  "block w-full cursor-pointer bg-transparent py-0.5 text-base text-white focus:outline-none [&>option]:bg-teal-950 [&>option]:text-white";

export function PlaceDetailsFields({
  fields,
  errors,
  set,
  describedBy,
  isStay,
  kindChoices,
}: {
  fields: Fields;
  errors: FieldErrors;
  set: (key: keyof Fields) => (value: string) => void;
  // "<id>-error" or "<id>-hint" for aria-describedby.
  describedBy: (key: keyof Fields, hint?: boolean) => string | undefined;
  isStay: boolean;
  // The categories (destination) or kinds (accommodation) to choose from.
  kindChoices: PlaceCategory[];
}) {
  return (
    <>
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
        hint={`Leave an empty line between paragraphs. ${fields.description.trim().length} of ${PLACE_LIMITS.description} characters`}
        error={errors.description}
      >
        {/* Grows with the text (team request 2026-11-28), so the admin
            sees every paragraph at once, as the place page shows them.
            field-sizing-content does the growing; browsers without it
            keep the 6 rows and the drag handle. */}
        <Textarea
          id="place-description"
          value={fields.description}
          onChange={(e) => set("description")(e.target.value)}
          rows={6}
          aria-invalid={!!errors.description}
          aria-describedby={describedBy("description", true)}
          className={cn(fieldInputClass, "field-sizing-content min-h-36 resize-y")}
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
    </>
  );
}
