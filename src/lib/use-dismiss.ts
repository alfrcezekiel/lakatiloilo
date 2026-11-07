"use client";

import { type RefObject, useEffect } from "react";

// Closes a small dropdown (the profile menu, the notifications bell) the
// same way everywhere: clicking anywhere outside `wrapper` closes it, and
// Escape closes it and puts the keyboard back on its `button`. Shared since
// the thread care round's code review, so a fix here reaches both.
export function useDismiss(
  open: boolean,
  close: () => void,
  wrapper: RefObject<HTMLElement | null>,
  button: RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!wrapper.current?.contains(event.target as Node)) close();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        close();
        button.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, close, wrapper, button]);
}
