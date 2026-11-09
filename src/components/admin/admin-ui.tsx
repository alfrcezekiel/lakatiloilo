"use client";

import { adminGlass } from "@/components/admin/AdminFrame";
import { backendMessage } from "@/lib/api";
import { readLogin } from "@/lib/login";
import { cn } from "@/lib/utils";

// Small pieces shared by the dashboard's screens (moved here in the code
// review of 2026-11-09, so a wording change is made once).

// "1 report", "3 reports".
export const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

// The cache label for the Reports list, shared by the screen and its
// Keep it / Hide it / Delete review buttons.
export const REPORTS_KEY = ["admin", "reports"] as const;

// Settings for every dashboard data request (slow admin pages, team
// report 2026-11-09). Each page starts its request straight away, next to
// the "who is logged in" check instead of after it, so the two run at the
// same time. Only with a login in this browser; a refusal is tried again
// once, not three times.
export const adminQuerySettings = () => ({ enabled: readLogin() !== null, retry: 1 });

// A sentence to show when something failed: the backend's own message,
// our own "Please log in again, then try again.", or a general one.
export function errorMessage(error: unknown): string {
  return (
    backendMessage(error) ??
    (error instanceof Error && error.message.startsWith("Please") ? error.message : null) ??
    "Something went wrong. Please try again."
  );
}

// "We couldn't load the reports." with the reason and a Try again button.
// `what` finishes the sentence: "the reports", "the places", ...
export function AdminLoadError({
  what,
  error,
  onRetry,
}: {
  what: string;
  error: unknown;
  onRetry: () => void;
}) {
  return (
    <div role="alert" className={cn(adminGlass, "p-6")}>
      <p className="font-semibold">We couldn&apos;t load {what}.</p>
      <p className="mt-1 text-white/85">{errorMessage(error)}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 inline-flex min-h-11 cursor-pointer items-center rounded-xl border border-white/40 px-4 font-semibold hover:border-amber-300 hover:text-amber-300 focus-visible:outline-2 focus-visible:outline-white"
      >
        Try again
      </button>
    </div>
  );
}
