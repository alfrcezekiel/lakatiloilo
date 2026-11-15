"use client";

import { AlertTriangle, Copyright, RotateCcw } from "lucide-react";
import { GlassField, fieldInputClass } from "@/components/GlassField";
import { Input } from "@/components/ui/input";
import {
  CREDIT_LIMITS,
  type AuthorizationStatus,
  type Licence,
  type PhotoCredits,
  type SavedPhotoCredits,
} from "@/lib/api";
import { authorizationStatusLabels, licenceLabels } from "@/lib/labels";

// The "Photo credits and copyright" box under the photo on the place form
// (photo credits round, ticket 132): who took the photo, where it was
// published, a link to the original, its licence, whether we may use it,
// and the credit line the site shows. The credit line fills itself in
// from the other fields until the admin types their own. The same checks
// as the backend and the database (054), with a message under each field.

export type Credits = {
  photographer: string;
  publisher: string;
  source_url: string;
  licence: Licence | "";
  authorization_status: AuthorizationStatus | "";
  credit_line: string;
  // The admin typed their own credit line (it no longer fills itself in).
  ownLine: boolean;
};
export type CreditKey = Exclude<keyof Credits, "ownLine">;
export type CreditErrors = Partial<Record<CreditKey, string>>;
export const CREDIT_ORDER: CreditKey[] = [
  "photographer",
  "publisher",
  "source_url",
  "licence",
  "authorization_status",
  "credit_line",
];

// How the licence reads at the end of the suggested credit line.
const LINE_ENDINGS: Record<string, string> = {
  cc_by_4: ", CC BY 4.0",
  cc_by_sa_4: ", CC BY-SA 4.0",
  cc0: ", public domain (CC0)",
  all_rights_reserved: ", used with permission",
};

// "Photo: Riyan0721 / Wikimedia Commons, CC BY-SA 4.0"
export function suggestedLine(c: Pick<Credits, "photographer" | "publisher" | "licence">) {
  const photographer = c.photographer.trim();
  if (!photographer) return "";
  const publisher = c.publisher.trim();
  return `Photo: ${photographer}${publisher ? ` / ${publisher}` : ""}${LINE_ENDINGS[c.licence] ?? ""}`;
}

export const EMPTY_CREDITS: Credits = {
  photographer: "",
  publisher: "",
  source_url: "",
  licence: "",
  authorization_status: "",
  credit_line: "",
  ownLine: false,
};

export const creditsOf = (saved: SavedPhotoCredits | null): Credits =>
  saved
    ? {
        photographer: saved.photographer,
        publisher: saved.publisher,
        source_url: saved.source_url,
        licence: saved.licence,
        authorization_status: saved.authorization_status,
        credit_line: saved.credit_line,
        ownLine: saved.credit_line !== suggestedLine(saved),
      }
    : EMPTY_CREDITS;

export const creditsEmpty = (c: Credits) => CREDIT_ORDER.every((key) => !c[key].trim());

export const sameCredits = (a: Credits, b: Credits) => CREDIT_ORDER.every((key) => a[key].trim() === b[key].trim());

// What is sent to the backend (after `checkCredits` found nothing).
export const creditsToSend = (c: Credits): PhotoCredits => ({
  photographer: c.photographer.trim(),
  publisher: c.publisher.trim(),
  source_url: c.source_url.trim(),
  licence: c.licence as Licence,
  authorization_status: c.authorization_status as AuthorizationStatus,
  credit_line: c.credit_line.trim(),
});

export function checkCredits(c: Credits): CreditErrors {
  const errors: CreditErrors = {};
  const photographer = c.photographer.trim();
  const sourceUrl = c.source_url.trim();
  const line = c.credit_line.trim();
  if (!photographer) errors.photographer = "Please enter the photographer's name.";
  else if (photographer.length > CREDIT_LIMITS.photographer)
    errors.photographer = `Please keep the name to ${CREDIT_LIMITS.photographer} characters.`;
  if (c.publisher.trim().length > CREDIT_LIMITS.publisher)
    errors.publisher = `Please keep it to ${CREDIT_LIMITS.publisher} characters.`;
  if (sourceUrl && !/^https:\/\/\S+$/.test(sourceUrl))
    errors.source_url = "Please enter a URL starting with https://, or leave it empty.";
  else if (sourceUrl.length > CREDIT_LIMITS.source_url)
    errors.source_url = `Please keep the URL to ${CREDIT_LIMITS.source_url} characters.`;
  if (!c.licence) errors.licence = "Please choose the copyright licence.";
  if (!c.authorization_status) errors.authorization_status = "Please choose the authorization status.";
  else if (c.licence === "all_rights_reserved" && c.authorization_status !== "owner_permission")
    errors.authorization_status =
      'A photo with "All rights reserved" needs "Permission from the owner". Ask the owner first, or choose another photo.';
  if (!line) errors.credit_line = "Please enter the credit line the site shows.";
  else if (line.length > CREDIT_LIMITS.credit_line)
    errors.credit_line = `Please keep the credit line to ${CREDIT_LIMITS.credit_line} characters.`;
  return errors;
}

const selectClass =
  "block w-full cursor-pointer bg-transparent py-0.5 text-base text-white focus:outline-none [&>option]:bg-teal-950 [&>option]:text-white";

export function PhotoCreditsField({
  credits,
  onChange,
  errors,
  photoChanged,
  busy,
  idPrefix = "credit",
  legend = "Photo credits and copyright",
}: {
  credits: Credits;
  onChange: (next: Credits, changed: CreditKey) => void;
  errors: CreditErrors;
  // The photo was replaced after the credits were saved.
  photoChanged: boolean;
  busy: boolean;
  // Each box on a page needs its own ids (several photos since ticket 144).
  idPrefix?: string;
  // "Photo credits and copyright", or e.g. "Photo 2: credits and copyright".
  legend?: string;
}) {
  // Changing photographer, publisher or licence refreshes the suggested
  // line, unless the admin wrote their own.
  const set = (key: CreditKey) => (value: string) => {
    const next = { ...credits, [key]: value } as Credits;
    if (key === "credit_line") next.ownLine = value.trim() !== "" && value !== suggestedLine(next);
    else if (!credits.ownLine) next.credit_line = suggestedLine(next);
    onChange(next, key);
  };
  const describedBy = (key: CreditKey, hint = false) =>
    errors[key] ? `${idPrefix}-${key}-error` : hint ? `${idPrefix}-${key}-hint` : undefined;
  const suggestion = suggestedLine(credits);

  return (
    <fieldset disabled={busy} className="space-y-4 rounded-2xl border border-white/25 p-4 sm:p-5">
      <legend className="flex items-center gap-2 px-1 text-sm font-semibold text-white">
        <Copyright aria-hidden="true" className="size-4 shrink-0 text-amber-300" />
        {legend}
      </legend>
      <p className="-mt-1 text-sm text-white/80">
        Who took this photo, and may we use it? The credit line shows with the photo on the site.
        Until the status is something other than &ldquo;Not checked yet&rdquo;, travelers see the
        Lakat Iloilo splash art instead of this photo.
      </p>
      {photoChanged && (
        <p
          role="status"
          className="flex items-start gap-2 rounded-xl border border-amber-300/70 px-3 py-2 text-sm text-amber-100"
        >
          <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-amber-300" />
          Check these credits: the photo was changed. Save them again once they fit the new photo.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <GlassField id={`${idPrefix}-photographer`} label="Photographer" error={errors.photographer}>
          <Input
            id={`${idPrefix}-photographer`}
            value={credits.photographer}
            onChange={(e) => set("photographer")(e.target.value)}
            placeholder="Name or username"
            autoComplete="off"
            aria-invalid={!!errors.photographer}
            aria-describedby={describedBy("photographer")}
            className={fieldInputClass}
          />
        </GlassField>
        <GlassField id={`${idPrefix}-publisher`} label="Publisher / website" hint="Optional" error={errors.publisher}>
          <Input
            id={`${idPrefix}-publisher`}
            value={credits.publisher}
            onChange={(e) => set("publisher")(e.target.value)}
            placeholder="e.g. Wikimedia Commons"
            autoComplete="off"
            aria-invalid={!!errors.publisher}
            aria-describedby={describedBy("publisher", true)}
            className={fieldInputClass}
          />
        </GlassField>
      </div>

      <GlassField
        id={`${idPrefix}-source_url`}
        label="Original photo URL"
        hint="Optional. Where the photo was found, starting with https://"
        error={errors.source_url}
      >
        <Input
          id={`${idPrefix}-source_url`}
          type="url"
          inputMode="url"
          value={credits.source_url}
          onChange={(e) => set("source_url")(e.target.value)}
          placeholder="https://"
          autoComplete="off"
          aria-invalid={!!errors.source_url}
          aria-describedby={describedBy("source_url", true)}
          className={fieldInputClass}
        />
      </GlassField>

      <div className="grid gap-4 sm:grid-cols-2">
        <GlassField id={`${idPrefix}-licence`} label="Copyright licence" error={errors.licence}>
          <select
            id={`${idPrefix}-licence`}
            value={credits.licence}
            onChange={(e) => set("licence")(e.target.value)}
            aria-invalid={!!errors.licence}
            aria-describedby={describedBy("licence")}
            className={selectClass}
          >
            {!credits.licence && (
              <option value="" disabled>
                Choose a licence
              </option>
            )}
            {Object.entries(licenceLabels).map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </GlassField>
        <GlassField id={`${idPrefix}-authorization_status`} label="Authorization status" error={errors.authorization_status}>
          <select
            id={`${idPrefix}-authorization_status`}
            value={credits.authorization_status}
            onChange={(e) => set("authorization_status")(e.target.value)}
            aria-invalid={!!errors.authorization_status}
            aria-describedby={describedBy("authorization_status")}
            className={selectClass}
          >
            {!credits.authorization_status && (
              <option value="" disabled>
                Choose a status
              </option>
            )}
            {Object.entries(authorizationStatusLabels).map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </GlassField>
      </div>

      <GlassField
        id={`${idPrefix}-credit_line`}
        label="Attribution / photo credits"
        hint={
          credits.ownLine
            ? `Your own line. ${credits.credit_line.trim().length} of ${CREDIT_LIMITS.credit_line} characters.`
            : "Fills itself in from the fields above. You can change it."
        }
        error={errors.credit_line}
      >
        <Input
          id={`${idPrefix}-credit_line`}
          value={credits.credit_line}
          onChange={(e) => set("credit_line")(e.target.value)}
          placeholder="Photo: name / website, licence"
          autoComplete="off"
          aria-invalid={!!errors.credit_line}
          aria-describedby={describedBy("credit_line", true)}
          className={fieldInputClass}
        />
      </GlassField>
      {credits.ownLine && suggestion && (
        <button
          type="button"
          onClick={() => onChange({ ...credits, credit_line: suggestion, ownLine: false }, "credit_line")}
          className="-mt-2 inline-flex min-h-11 cursor-pointer items-center gap-2 text-sm font-semibold text-amber-200 hover:text-amber-300 focus-visible:outline-2 focus-visible:outline-white"
        >
          <RotateCcw aria-hidden="true" className="size-4 shrink-0" />
          Use the suggested line
        </button>
      )}
    </fieldset>
  );
}
