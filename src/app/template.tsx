"use client";

import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

// Next.js wraps every page in this "template" and builds it again each
// time the traveler moves to another page (unlike layout.tsx, which stays).
// So the new page fades in: home, a destination or accommodation page,
// login, photo credits, and back again (navigation round, ticket 64).
//
// Only how see-through the page is changes, never its position: a moving
// wrapper would stop the floating navbar and the scroll-to-top button from
// staying in place. The fade is plain CSS ("animate-page-fade" in
// globals.css). "motion-safe:" skips it when the device's "reduce motion"
// setting is on. The old page does not fade out: Next.js removes it at
// once (see docs/SPEC.md, navigation round).
//
// Not on the FIRST page of a visit (2026-11-18). The fade starts the whole
// page invisible, so the browser only counted the main content as shown
// once the fade had run. In Lighthouse on a slow phone that made the home
// page's LCP about 8 s, and measured in a slowed-down Chrome it moved LCP
// from 0.3 s to 1.3 s. The first page is already there, so it does not
// need to fade in; every page after that still does.
//
// How: the server never adds the fade, and neither does the browser's
// first render (so the HTML matches and React has nothing to correct).
// After the first page is shown, `firstPage` is false, so each new page
// the traveler moves to starts with the fade.
let firstPage = true;

export default function Template({ children }: { children: ReactNode }) {
  const [fadeIn] = useState(() => !firstPage);
  useEffect(() => {
    firstPage = false;
  }, []);

  // "flex flex-1 flex-col" keeps the page laid out exactly as before, as if
  // this wrapper were not there.
  return <div className={cn("flex flex-1 flex-col", fadeIn && "motion-safe:animate-page-fade")}>{children}</div>;
}
