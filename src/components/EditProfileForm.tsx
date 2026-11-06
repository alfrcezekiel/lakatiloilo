"use client";

import { Check, X } from "lucide-react";
import { useState } from "react";
import { pillButton } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { backendMessage, updateMe, type Traveler } from "@/lib/api";
import { travelerTypes } from "@/lib/labels";
import { loginToken } from "@/lib/login";

const fallbackError = "Something went wrong. Please try again.";

// Edit profile (profile & replies round, ticket 94): the traveler's own
// display name (2 to 40 characters) and "I'm traveling as". The backend
// saves them on the account, and the database copies them onto every
// review and reply the traveler has written (supabase/sql/030). Like the
// review form, the checks here are for friendly messages; the backend
// checks everything again.
export function EditProfileForm({
  user,
  onSaved,
  onCancel,
}: {
  user: Traveler;
  onSaved: (user: Traveler) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(user.display_name);
  const [travelerType, setTravelerType] = useState(user.traveler_type ?? "");
  const [nameError, setNameError] = useState<string | null>(null);
  const [typeError, setTypeError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    const trimmed = name.trim();
    const newNameError =
      trimmed.length < 2 || trimmed.length > 40 ? "Your display name needs 2 to 40 characters." : null;
    const newTypeError = travelerType ? null : "Please pick how you're traveling.";
    setNameError(newNameError);
    setTypeError(newTypeError);
    if (newNameError || newTypeError) return;

    setBusy(true);
    try {
      const token = await loginToken();
      if (!token) {
        setFormError("Please log in again, then try again.");
        return;
      }
      onSaved(await updateMe(token, { display_name: trimmed, traveler_type: travelerType }));
    } catch (error) {
      setFormError(backendMessage(error) ?? fallbackError);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      aria-label="Edit profile"
      className="mt-6 max-w-md space-y-5 rounded-xl border border-white/25 bg-white/15 p-5"
    >
      <div className="space-y-2">
        <Label htmlFor="profile-name" className="text-sm font-semibold text-white">
          Display name
        </Label>
        <Input
          id="profile-name"
          value={name}
          maxLength={60}
          autoComplete="nickname"
          onChange={(e) => {
            setName(e.target.value);
            setNameError(null);
          }}
          aria-invalid={!!nameError}
          aria-describedby={nameError ? "profile-name-error" : undefined}
          className="border-white/25 bg-white/10 text-white placeholder:text-white/50"
        />
        {nameError && (
          <p id="profile-name-error" role="alert" className="text-sm text-amber-200">
            {nameError}
          </p>
        )}
      </div>

      <fieldset>
        <legend className="mb-2 text-sm font-semibold">I&apos;m traveling as</legend>
        <div className="grid grid-cols-3 gap-2">
          {travelerTypes.map((type) => (
            <label
              key={type.id}
              className={`flex cursor-pointer items-center justify-center rounded-full border px-2 py-2 text-center text-xs leading-tight font-medium transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-white sm:text-sm ${
                travelerType === type.id
                  ? "border-white bg-white text-teal-900 shadow"
                  : "border-white/25 bg-white/10 text-white hover:bg-white/20"
              }`}
            >
              <input
                type="radio"
                name="profile-traveler-type"
                value={type.id}
                checked={travelerType === type.id}
                onChange={() => {
                  setTravelerType(type.id);
                  setTypeError(null);
                }}
                className="sr-only"
              />
              {type.label}
            </label>
          ))}
        </div>
        {typeError && (
          <p role="alert" className="mt-1 text-sm text-amber-200">
            {typeError}
          </p>
        )}
      </fieldset>

      {formError && (
        <p role="alert" className="text-sm text-amber-200">
          {formError}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        {/* disabled while saving, so it cannot be sent twice. */}
        <button type="submit" disabled={busy} className={pillButton({ kind: "main" })}>
          {busy ? <Spinner /> : <Check aria-hidden="true" />}
          {busy ? "Saving…" : "Save"}
        </button>
        <button type="button" onClick={onCancel} disabled={busy} className={pillButton({ kind: "glass" })}>
          <X aria-hidden="true" />
          Cancel
        </button>
      </div>
    </form>
  );
}
