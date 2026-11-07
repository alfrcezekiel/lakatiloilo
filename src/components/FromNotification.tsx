import { Bell } from "lucide-react";

// The small amber label on the review or reply a notification opened
// (ticket 103, change 2026-11-07, team request): together with the amber
// line and background it marks "this is the one you came for" for as long
// as the page shows it, not only during the first glow.
export function FromNotification() {
  return (
    <p className="mb-1.5 inline-flex items-center gap-1 rounded-full border border-amber-300/50 bg-amber-300/15 px-2 py-0.5 text-xs font-semibold text-amber-200">
      <Bell aria-hidden="true" className="size-3" />
      From your notification
    </p>
  );
}

// The amber look shared by both: a soft amber background, a short glow on
// arrival (animate-highlight in globals.css).
export const notifiedTint = "bg-amber-300/10 animate-highlight";
