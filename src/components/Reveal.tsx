"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode, type RefObject } from "react";
import { animate, inView } from "motion";
import { useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

// How far (in pixels) things travel as they fade in.
const DISTANCE = 40;
// How long the slide in takes.
const SLIDE_SECONDS = 0.7;
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
// `amount` is how much of it must be on screen to count as "on screen":
// 15% by default. Very tall blocks (a place's reviews, which threaded
// replies make long on a phone) pass "some", meaning any part of it: with
// 15%, a tall block faded out while the traveler was still reading or
// typing in it, for example at the bottom of the page or with the phone
// keyboard open (fixed 2026-11-02).
// With the device's "reduce motion" setting on, nothing moves at all.
export function Reveal({
  children,
  className,
  delay = 0,
  amount = 0.15,
  as = "div",
  visibleFromStart = false,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  amount?: number | "some";
  as?: "div" | "li" | "section";
  // On page load, rise without starting invisible ("animate-rise-up").
  // For the first thing a traveler sees (the home hero): text that starts
  // invisible counts as shown only once it fades in, which made the home
  // page's main content (LCP) about 8 s late on a slow phone in
  // Lighthouse (2026-11-18). Scrolling away and back still fades as usual.
  visibleFromStart?: boolean;
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

    // Why `shown` and `arriving` (jiggle fix, found by the Playwright tests
    // 2026-11-17): the browser decides "on screen" from where the element
    // is DRAWN, and the fade-in itself moves it. A block whose edge sat just
    // inside the screen jiggled forever: sliding in starts 40 px lower,
    // which put it off the screen, so it faded out, came back on, and slid
    // in again, over and over. Now:
    // - "left the screen" while it is still arriving is ignored (the slide
    //   moved it, not the traveler), and
    // - "came on screen" while it is already shown does nothing.
    let shown = false; // visible, or on its way in
    let arriving = false; // the page-load fade or a slide is still playing
    let arrived: ReturnType<typeof setTimeout> | undefined;
    let hideFrame = 0;

    // Is the CSS fade from page load still playing on screen?
    const box = element.getBoundingClientRect();
    const cssPlaying =
      box.top < window.innerHeight && box.bottom > 0 && element.getAnimations().length > 0;
    if (cssPlaying) {
      shown = true;
      arriving = true;
      element.addEventListener(
        "animationend",
        () => {
          arriving = false;
          stopCss();
        },
        { once: true },
      );
    } else {
      // Below or above the screen: hide it until it scrolls into view.
      const offScreen = box.top >= window.innerHeight || box.bottom <= 0;
      // The style changes wait for the next frame (ticket 158). When the
      // places arrive, about 50 of these start together. Changing a style
      // here, between one block's measuring and the next, made the browser
      // lay out the whole page again for every block, which kept a phone
      // busy (Lighthouse TBT). Now every block measures first, and all the
      // changes happen together in one frame, before anything is drawn.
      hideFrame = requestAnimationFrame(() => {
        if (shown) return; // it already came into view
        stopCss();
        if (offScreen) animate(element, { opacity: 0 }, { duration: 0 });
      });
    }

    const fadeOut = () => {
      if (arriving) return;
      shown = false;
      stopCss();
      animate(element, { opacity: 0 }, { duration: 0.25 });
    };

    const stop = inView(
      element,
      (_, entry) => {
        // Already visible or on its way in (including the page-load fade):
        // nothing to start.
        if (shown) return fadeOut;
        shown = true;
        arriving = true;
        stopCss();
        // Entering at the top edge means the traveler is scrolling up.
        const fromAbove = entry.boundingClientRect.top < (entry.rootBounds?.top ?? 0);
        animate(
          element,
          { opacity: [0, 1], y: [fromAbove ? -DISTANCE : DISTANCE, 0] },
          { duration: SLIDE_SECONDS, delay, ease: EASE },
        );
        clearTimeout(arrived);
        arrived = setTimeout(() => {
          arriving = false;
        }, (delay + SLIDE_SECONDS) * 1000);
        // Returning a function makes inView call it when the element
        // leaves the screen, and keep watching for the next time.
        return fadeOut;
      },
      { amount },
    );

    return () => {
      stop();
      clearTimeout(arrived);
      cancelAnimationFrame(hideFrame);
      // Leave it visible if this component goes away mid-animation.
      element.style.animation = "";
      animate(element, { opacity: 1, y: 0 }, { duration: 0 });
    };
  }, [reduceMotion, delay, amount]);

  const Tag = as as "div";
  const style: CSSProperties | undefined = delay ? { animationDelay: `${delay}s` } : undefined;
  return (
    <Tag
      ref={ref as RefObject<HTMLDivElement>}
      className={cn(visibleFromStart ? "motion-safe:animate-rise-up" : "motion-safe:animate-fade-up", className)}
      style={style}
    >
      {children}
    </Tag>
  );
}
