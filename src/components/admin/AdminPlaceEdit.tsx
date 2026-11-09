"use client";

import { ArrowLeft, Check, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminShell } from "@/components/admin/AdminShell";
import { adminGlass } from "@/components/admin/AdminFrame";
import { ADMIN_PLACES_KEY } from "@/components/admin/AdminPlaces";
import { AdminLoadError, errorMessage } from "@/components/admin/admin-ui";
import { GlassField, fieldInputClass } from "@/components/GlassField";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import {
  getAdminPlace,
  PLACE_LIMITS,
  updateAdminPlace,
  type AdminPlaceDetails,
} from "@/lib/api";
import { freshToken } from "@/lib/login";
import { cn } from "@/lib/utils";

// Editing one place (/admin/places/<destination|accommodation>/<id>,
// ticket 112): name, description and address, plus phone and email for an
// accommodation. Save sends the changes to the backend, which saves them as
// the admin (the database allows only these columns, supabase/sql/043);
// open place pages show the change at once (Realtime, 029). Cancel goes
// back to the list and changes nothing.

type Fields = { name: string; description: string; address: string; phone: string; email: string };
type FieldErrors = Partial<Record<keyof Fields, string>>;

const fieldsOf = (place: AdminPlaceDetails): Fields => ({
  name: place.name,
  description: place.description,
  address: place.address,
  phone: place.phone ?? "",
  email: place.email ?? "",
});

// The same checks as the backend, with a message under each field.
function check(fields: Fields, isStay: boolean): FieldErrors {
  const errors: FieldErrors = {};
  const name = fields.name.trim();
  const description = fields.description.trim();
  const address = fields.address.trim();
  if (!name) errors.name = "Please write a name.";
  else if (name.length > PLACE_LIMITS.name) errors.name = `Please keep the name to ${PLACE_LIMITS.name} characters.`;
  if (!description) errors.description = "Please write a description.";
  else if (description.length > PLACE_LIMITS.description)
    errors.description = `Please keep the description to ${PLACE_LIMITS.description} characters.`;
  if (!address) errors.address = "Please write an address.";
  else if (address.length > PLACE_LIMITS.address)
    errors.address = `Please keep the address to ${PLACE_LIMITS.address} characters.`;
  if (isStay) {
    const phone = fields.phone.trim();
    const email = fields.email.trim();
    if (phone.length > PLACE_LIMITS.phone || (phone && !/^[0-9+()\-.\s]+$/.test(phone)))
      errors.phone = `Use digits, spaces and + ( ) - only, up to ${PLACE_LIMITS.phone} characters, or leave it empty.`;
    if (email.length > PLACE_LIMITS.email || (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)))
      errors.email = "Please write a valid email address, or leave it empty.";
  }
  return errors;
}

const FIELD_ORDER: (keyof Fields)[] = ["name", "description", "address", "phone", "email"];

function EditForm({ place }: { place: AdminPlaceDetails }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const isStay = place.type === "accommodation";
  const [fields, setFields] = useState<Fields>(() => fieldsOf(place));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const savedLine = useRef<HTMLParagraphElement>(null);

  const placeHref = `/${isStay ? "accommodations" : "destinations"}/${place.id}`;
  const unchanged = FIELD_ORDER.every((key) => fields[key].trim() === fieldsOf(place)[key].trim());

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
    const first = FIELD_ORDER.find((key) => found[key]);
    if (first) {
      document.getElementById(`place-${first}`)?.focus();
      return;
    }
    setBusy(true);
    try {
      const token = await freshToken();
      if (!token) throw new Error("Please log in again, then try again.");
      const updated = await updateAdminPlace(token, place.type, place.id, {
        name: fields.name.trim(),
        description: fields.description.trim(),
        address: fields.address.trim(),
        ...(isStay ? { phone: fields.phone.trim(), email: fields.email.trim() } : {}),
      });
      queryClient.setQueryData(["admin", "place", place.type, place.id], updated);
      void queryClient.invalidateQueries({ queryKey: ADMIN_PLACES_KEY });
      setFields(fieldsOf(updated));
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
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/75">
          {isStay ? "Accommodation" : "Destination"}
        </p>
        <h2 className="font-fraunces mt-1 text-2xl font-medium break-words">{place.name}</h2>
        <p className="mt-1 text-sm text-white/80">
          The photo, category and map position stay as they are.
        </p>
      </div>

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
          {busy ? "Saving…" : "Save"}
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
      {unchanged && !saved && (
        <p className="text-xs text-white/70">Save turns on once something has changed.</p>
      )}
    </form>
  );
}

function PlaceEditData() {
  const params = useParams<{ type: string; id: string }>();
  const place = useQuery({
    queryKey: ["admin", "place", params.type, params.id],
    queryFn: async () => {
      const token = await freshToken();
      if (!token) throw new Error("Please log in again, then try again.");
      return getAdminPlace(token, params.type, params.id);
    },
    // Keep the form as the admin left it while they type.
    refetchOnWindowFocus: false,
  });

  if (place.isPending) {
    return (
      <div className="space-y-3">
        <p role="status" className="sr-only">
          Loading the place
        </p>
        <Skeleton className="h-[32rem] w-full rounded-2xl" />
      </div>
    );
  }
  if (place.isError) {
    return <AdminLoadError what="this place" error={place.error} onRetry={() => void place.refetch()} />;
  }
  if (!place.data) {
    return (
      <div role="alert" className={cn(adminGlass, "p-6")}>
        <p className="font-semibold">We couldn&apos;t find that place.</p>
        <p className="mt-1 text-white/85">
          It may have a mistyped address. Go back to the list and pick it again.
        </p>
      </div>
    );
  }
  // Keyed by the place, so opening another place starts a fresh form.
  return <EditForm key={`${params.type}-${params.id}`} place={place.data} />;
}

export function AdminPlaceEdit() {
  return (
    <AdminShell title="Edit place">
      <Link
        href="/admin/places"
        className="mb-4 inline-flex min-h-11 items-center gap-2 font-semibold text-white/90 hover:text-amber-300 focus-visible:outline-2 focus-visible:outline-white"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        All places
      </Link>
      <PlaceEditData />
    </AdminShell>
  );
}
