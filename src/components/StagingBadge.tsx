// A small "STAGING" label in the bottom-left corner of every page on the
// staging site, so nobody mistakes it for the live one. Shown by
// src/app/layout.tsx only when NEXT_PUBLIC_APP_ENV is "staging".
// pointer-events-none: clicks go straight through to whatever is under it.
// Sunset coral with dark teal text (about 5.5:1 contrast, WCAG AA).
export function StagingBadge() {
  return (
    <div className="pointer-events-none fixed bottom-3 left-3 z-100 rounded-md bg-[#ff6f59] px-2 py-1 font-mono-label text-[0.7rem] font-medium text-teal-950 shadow-md select-none">
      Staging
    </div>
  );
}
