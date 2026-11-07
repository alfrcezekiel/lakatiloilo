"use client";

import { useSearchParams } from "next/navigation";

// Which review or reply a notification asked the place page to show
// (ticket 103, change 2026-11-07): "review-<id>" or "reply-<id>". It
// travels in the address as "?focus=…", which Next.js tracks reliably,
// also when the link points at the page that is already open (it does not
// tell the page when only the "#…" part changes). The page unfolds the
// thread around a reply, scrolls to it and makes it glow for a moment.
// Arriving at the page any other way has no "?focus", so nothing jumps.
const PATTERN = /^(review|reply)-[0-9a-f-]{36}$/i;

// The current target, or null.
export function useFocusTarget() {
  const focus = useSearchParams().get("focus");
  return focus && PATTERN.test(focus) ? focus : null;
}

// Clicking a notification also tells the open page directly, so it
// scrolls to the item again even when the address does not change (the
// same notification clicked twice, or after scrolling away).
export const FOCUS_EVENT = "lakat-focus";

export function announceFocus(target: string) {
  window.dispatchEvent(new CustomEvent<string>(FOCUS_EVENT, { detail: target }));
}
