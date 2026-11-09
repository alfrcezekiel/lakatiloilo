"use client";

import { Bell } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { Traveler } from "@/lib/api";
import { useLiveNotifications, useNotifications } from "@/lib/notifications";
import { useDismiss } from "@/lib/use-dismiss";
import { cn } from "@/lib/utils";
import { NotificationList } from "@/components/NotificationList";

// The notifications bell (thread care round, ticket 102). Logged in, a
// bell sits beside the profile icon, with a small red dot and number when
// something is unread. Clicking it opens a glass list of the traveler's
// newest notifications (up to 20), like "Maria replied to your review of
// Bucari Little Baguio · 5 min ago"; Helpful marks on the traveler's
// reviews and replies notify too (ticket 106). The phone menu has a
// "Notifications" line that opens the same list in place. The backend only
// ever answers with the traveler's own notifications (Row Level Security,
// 035).
//
// Clicking a notification opens that place's page at the review and marks
// it read, so the red number goes down and disappears when nothing is
// unread; "Mark all as read" sits at the top (ticket 103). The bell
// updates by itself through Supabase Realtime (ticket 104,
// useLiveNotifications).
//
// The data side lives in src/lib/notifications.ts and the list in
// NotificationList.tsx; this file is the bell and the phone menu line.

// The red dot with the unread number ("9+" past 9), or nothing.
function UnreadDot({ count }: { count: number }) {
  if (count < 1) return null;
  return (
    <span
      aria-hidden="true"
      className="absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[0.7rem] font-bold leading-none text-white"
    >
      {count > 9 ? "9+" : count}
    </span>
  );
}

// The bell in the bar on tablets and laptops, beside the profile icon. It
// works like the profile dropdown: closes with Escape (the keyboard goes
// back to the bell) or by clicking anywhere else.
export function NotificationsBell({ user }: { user: Traveler }) {
  const [open, setOpen] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const listId = useId();
  const { data, refetch } = useNotifications(user);
  const unread = data?.unread_count ?? 0;

  // Live updates (ticket 104): see useLiveNotifications. The bell is on
  // every page (hidden on phones, but still there), so it listens once.
  useLiveNotifications(user);

  const close = useCallback(() => setOpen(false), []);
  useDismiss(open, close, wrapper, button);

  // Scrolling over the open dropdown never scrolls the page behind it
  // (team report 2026-11-07). The list scrolls inside its own box; at its
  // top or bottom, or when it is too short to scroll, the browser would
  // pass the scroll on to the page ("scroll chaining"). overscroll-contain
  // on the list stops most of that; this stops the rest, including
  // scrolling over the heading or "Mark all as read". A native listener,
  // because React's onWheel cannot cancel scrolling.
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = panel.current;
    if (!open || !el) return;
    const onWheel = (event: WheelEvent) => {
      const list = el.querySelector<HTMLElement>("[data-notification-scroll]");
      if (list?.contains(event.target as Node)) {
        const atTop = event.deltaY < 0 && list.scrollTop <= 0;
        const atBottom =
          event.deltaY > 0 && list.scrollTop + list.clientHeight >= list.scrollHeight - 1;
        if (!atTop && !atBottom) return;
      }
      event.preventDefault();
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [open]);

  // If the page scrolls anyway while the dropdown is open (the keyboard's
  // Space or Page Down, the scroll bar, or the wheel away from it), the
  // dropdown closes instead of floating over a page that moves under it
  // (code review of commit 092153e).
  useEffect(() => {
    if (!open) return;
    window.addEventListener("scroll", close, { passive: true });
    return () => window.removeEventListener("scroll", close);
  }, [open, close]);

  return (
    <div ref={wrapper} className="relative">
      <button
        ref={button}
        type="button"
        onClick={() => {
          if (!open) void refetch();
          setOpen((o) => !o);
        }}
        aria-expanded={open}
        aria-controls={listId}
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
        className={cn(
          "relative flex size-9 cursor-pointer items-center justify-center rounded-full border transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white",
          open
            ? "border-amber-300 bg-amber-400 text-amber-950"
            : "border-white/30 bg-white/10 text-white hover:bg-white/20",
        )}
      >
        <Bell aria-hidden="true" className="size-5" />
        <UnreadDot count={unread} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            ref={panel}
            id={listId}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full z-50 mt-3 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-white/20 bg-teal-900 p-1.5 shadow-2xl"
          >
            <p className="border-b border-white/15 px-3 pt-2 pb-2.5 font-fraunces text-lg font-medium text-white">
              Notifications
            </p>
            <NotificationList user={user} onOpen={() => setOpen(false)} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// The "Notifications" line in the phone menu: opens the same list under it.
// onOpen closes the phone menu when a notification is clicked.
export function PhoneNotifications({ user, onOpen }: { user: Traveler; onOpen: () => void }) {
  const [open, setOpen] = useState(false);
  const listId = useId();
  const { data, refetch } = useNotifications(user);
  const unread = data?.unread_count ?? 0;
  return (
    <div>
      <button
        type="button"
        onClick={() => {
          if (!open) void refetch();
          setOpen((o) => !o);
        }}
        aria-expanded={open}
        aria-controls={listId}
        className="flex w-full cursor-pointer items-center gap-2 py-3 text-left hover:text-white/80"
      >
        <span className="relative">
          <Bell aria-hidden="true" className="size-5" />
          <UnreadDot count={unread} />
        </span>
        Notifications
        {unread > 0 && <span className="sr-only">, {unread} unread</span>}
      </button>
      {open && (
        <div id={listId} className="rounded-xl border border-white/20 bg-teal-950/60 p-1">
          <NotificationList user={user} onOpen={onOpen} scrollInside={false} />
        </div>
      )}
    </div>
  );
}
