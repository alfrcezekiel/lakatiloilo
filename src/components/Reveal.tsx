"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode, type RefObject } from "react";
import { animate, inView } from "motion";
import { useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

// How far (in pixels) things travel as they fade in.
const DISTANCE = 40;
const EASE = [0.22, 1, 0.36, 1] as const;

// Makes its contents fade in, every time they come onto the screen:
// - On page load: whatever is on screen rises up as soon as the page is
//   painted. This first fade is plain CSS ("animate-fade-up" in
//   globals.css), so it never waits for the page's JavaScript; the text is
//   in the page from the server the whole time.
// - Scrolling down: things rise up from below (fade up).
// - Scrolling back up: things come down from above (fade down).
// - Off screen: they fade out, ready to fade in again next time.
// `delay` (seconds) lets cards in one row arrive one after another.
// With the device's "reduce motion" setting on, nothing moves at all.
export function Reveal({
  children,
  className,
  delay = 0,
  as = "div",
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  as?: "div" | "li" | "section";
}) {
  const ref = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const element = ref.current;
    if (!element || reduceMotion) return;

    // From here on Motion is in charge, so switch the CSS fade off. (A
    // finished CSS animation would otherwise keep overriding Motion.)
    const stopCss = () => {
      element.style.animation = "none";
    };

    // Is the CSS fade from page load still playing on screen?
    const box = element.getBoundingClientRect();
    let cssPlaying =
      box.top < window.innerHeight && box.bottom > 0 && element.getAnimations().length > 0;
    if (cssPlaying) {
      element.addEventListener(
        "animationend",
        () => {
          cssPlaying = false;
          stopCss();
        },
        { once: true },
      );
    } else {
      stopCss();
      // Below or above the screen: hide it until it scrolls into view.
      if (box.top >= window.innerHeight || box.bottom <= 0) {
        animate(element, { opacity: 0 }, { duration: 0 });
      }
    }

    const fadeOut = () => {
      cssPlaying = false;
      stopCss();
      animate(element, { opacity: 0 }, { duration: 0.25 });
    };

    const stop = inView(
      element,
      (_, entry) => {
        // Still rising from page load: let the CSS fade finish.
        if (cssPlaying) return fadeOut;
        stopCss();
        // Entering at the top edge means the traveler is scrolling up.
        const fromAbove = entry.boundingClientRect.top < (entry.rootBounds?.top ?? 0);
        animate(
          element,
          { opacity: [0, 1], y: [fromAbove ? -DISTANCE : DISTANCE, 0] },
          { duration: 0.7, delay, ease: EASE },
        );
        // Returning a function makes inView call it when the element
        // leaves the screen, and keep watching for the next time.
        return fadeOut;
      },
      { amount: 0.15 },
    );

    return () => {
      stop();
      // Leave it visible if this component goes away mid-animation.
      element.style.animation = "";
      animate(element, { opacity: 1, y: 0 }, { duration: 0 });
    };
  }, [reduceMotion, delay]);

  const Tag = as as "div";
  const style: CSSProperties | undefined = delay ? { animationDelay: `${delay}s` } : undefined;
  return (
    <Tag
      ref={ref as RefObject<HTMLDivElement>}
      className={cn("motion-safe:animate-fade-up", className)}
      style={style}
    >
      {children}
    </Tag>
  );
}
