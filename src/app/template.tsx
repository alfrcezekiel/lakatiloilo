import type { ReactNode } from "react";

// Next.js wraps every page in this "template" and builds it again each
// time the traveler moves to another page (unlike layout.tsx, which stays).
// So the new page fades in: home, a destination or accommodation page,
// login, photo credits, and back again (navigation round, ticket 64).
//
// Only how see-through the page is changes, never its position: a moving
// wrapper would stop the floating navbar and the scroll-to-top button from
// staying in place. The fade is plain CSS ("animate-page-fade" in
// globals.css), so the page is in the HTML from the server and the fade
// starts as soon as it is painted. "motion-safe:" skips it when the
// device's "reduce motion" setting is on. The old page does not fade out:
// Next.js removes it at once (see docs/SPEC.md, navigation round).
//
// "flex flex-1 flex-col" keeps the page laid out exactly as before, as if
// this wrapper were not there.
export default function Template({ children }: { children: ReactNode }) {
  return <div className="flex flex-1 flex-col motion-safe:animate-page-fade">{children}</div>;
}
