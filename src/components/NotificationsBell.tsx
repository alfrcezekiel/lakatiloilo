"use client";

import {
  Bell,
  CheckCheck,
  ChevronDown,
  CornerDownRight,
  type LucideIcon,
  MessageCircle,
  ThumbsUp,
} from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getNotifications,
  markNotificationsRead,
  type Traveler,
  type TravelerNotification,
} from "@/lib/api";
import { announceFocus } from "@/lib/focus-target";
import { loginToken } from "@/lib/login";
import { useTableChanges } from "@/lib/realtime";
import { useDismiss } from "@/lib/use-dismiss";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

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
// updates by itself through Supabase Realtime (ticket 104, see below).

// The list shows this many newest notifications first; "See previous
// notifications" shows the rest (up to the 20 the backend sends).
const FIRST_SHOWN = 6;

// The tables whose changes make or remove notifications.
const NOTIFYING_TABLES = ["review_replies", "review_likes", "reply_likes"] as const;

type NotificationData = { notifications: TravelerNotification[]; unread_count: number };
const notificationsKey = (userId: string) => ["notifications", userId] as const;

// The traveler's notifications, asked again whenever the list is opened.
export function useNotifications(user: Traveler) {
  return useQuery({
    queryKey: notificationsKey(user.id),
    queryFn: async () => {
      const token = await loginToken();
      if (!token) throw new Error("Please log in again, then try again.");
      return getNotifications(token);
    },
  });
}

// Marks one notification read (or all, without an id): the list and the
// red number change at once, then the backend's count replaces the guess.
// If the backend refuses, the list is fetched again.
function useMarkRead(user: Traveler) {
  const queryClient = useQueryClient();
  return useCallback(
    async (id?: string) => {
      const key = notificationsKey(user.id);
      queryClient.setQueryData<NotificationData>(key, (old) => {
        if (!old) return old;
        const notifications = old.notifications.map((n) =>
          !id || n.id === id ? { ...n, read: true } : n,
        );
        const changed = old.notifications.filter((n) => !n.read && (!id || n.id === id)).length;
        return { notifications, unread_count: Math.max(0, old.unread_count - changed) };
      });
      try {
        const token = await loginToken();
        if (!token) throw new Error("Please log in again, then try again.");
        const { unread_count } = await markNotificationsRead(token, id);
        queryClient.setQueryData<NotificationData>(key, (old) => old && { ...old, unread_count });
      } catch {
        void queryClient.invalidateQueries({ queryKey: key });
      }
    },
    [queryClient, user.id],
  );
}

// What the place page should show (change 2026-11-07, team request): the
// reply itself (its thread opens and it glows for a moment), or the review
// for a Helpful mark on a review. It goes in the address as "?focus=" (see
// src/lib/focus-target.ts).
const focusOf = (n: TravelerNotification) =>
  n.reply_id ? `reply-${n.reply_id}` : `review-${n.review_id}`;

// The place page, at that reply or review.
const placeHref = (n: TravelerNotification) =>
  `/${n.place_type === "destination" ? "destinations" : "accommodations"}/${n.place_id}?focus=${focusOf(n)}`;

// Each kind has its own small icon, so replies, answers and Helpful marks
// are told apart at a glance. Helpful marks use the Helpful button's thumb,
// in amber.
const kindIcon: Record<TravelerNotification["kind"], { icon: LucideIcon; label: string }> = {
  review_reply: { icon: MessageCircle, label: "Reply" },
  reply_answer: { icon: CornerDownRight, label: "Answer" },
  review_like: { icon: ThumbsUp, label: "Helpful" },
  reply_like: { icon: ThumbsUp, label: "Helpful" },
};

// "just now", "5 min ago", "3 h ago", "2 days ago", then the date.
function timeAgo(iso: string) {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} ${days === 1 ? "day" : "days"} ago`;
  return new Date(iso).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
}

// "Maria replied to your review of Bucari Little Baguio", and so on.
function sentence(n: TravelerNotification) {
  switch (n.kind) {
    case "review_reply":
      return `${n.actor_name} replied to your review of ${n.place_name}`;
    case "reply_answer":
      return `${n.actor_name} answered your reply on ${n.place_name}`;
    case "review_like":
      return `${n.actor_name} found your review of ${n.place_name} helpful`;
    case "reply_like":
      return `${n.actor_name} found your reply on ${n.place_name} helpful`;
  }
}

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

// The small round icon for one kind of notification.
function KindIcon({ kind }: { kind: TravelerNotification["kind"] }) {
  const { icon: Icon, label } = kindIcon[kind];
  const helpful = kind === "review_like" || kind === "reply_like";
  return (
    <span
      title={label}
      className={cn(
        "flex size-7 shrink-0 items-center justify-center rounded-full border",
        helpful ? "border-amber-300/50 text-amber-300" : "border-white/25 text-white/85",
      )}
    >
      <Icon aria-hidden="true" className="size-3.5" />
    </span>
  );
}

// Three grey rows shaped like notifications (icon, a line of text, the
// time), shown while the list loads for the first time.
function NotificationSkeleton() {
  return (
    <div className="space-y-1">
      <p role="status" className="sr-only">
        Loading notifications
      </p>
      {[0, 1, 2].map((row) => (
        <div key={row} className="flex gap-2.5 px-3 py-2.5">
          <span className="size-2 shrink-0" />
          <Skeleton className="size-7 shrink-0 rounded-full" />
          <div className="flex-1 space-y-1.5 pt-0.5">
            <Skeleton className="h-3.5 w-11/12" />
            <Skeleton className="h-3.5 w-3/5" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}

// The list itself, shared by the dropdown and the phone menu. onOpen
// closes the dropdown or the phone menu when a notification is clicked.
// In the dropdown the list scrolls inside a box; in the phone menu it shows
// at full length and the whole menu scrolls instead (scrollInside false),
// so one swipe reaches My profile and Log out below it. It starts with the
// newest FIRST_SHOWN; "See previous notifications" shows the rest.
function NotificationList({
  user,
  onOpen,
  scrollInside = true,
}: {
  user: Traveler;
  onOpen: () => void;
  scrollInside?: boolean;
}) {
  const { data, isPending, isError } = useNotifications(user);
  const markRead = useMarkRead(user);
  const [showAll, setShowAll] = useState(false);
  if (isPending) return <NotificationSkeleton />;
  if (isError) {
    return (
      <p role="alert" className="px-3 py-3 text-sm text-amber-200">
        Could not load your notifications right now. Please try again.
      </p>
    );
  }
  if (data.notifications.length === 0) {
    return <p className="px-3 py-3 text-sm text-white/75">No notifications yet.</p>;
  }
  const shown = showAll ? data.notifications : data.notifications.slice(0, FIRST_SHOWN);
  return (
    <>
      {data.unread_count > 0 && (
        <div className="flex justify-end border-b border-white/10 px-3 py-1.5">
          <button
            type="button"
            onClick={() => void markRead()}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded text-xs font-medium text-white/85 underline-offset-4 hover:text-amber-300 hover:underline focus-visible:outline-2 focus-visible:outline-white [&_svg]:size-3.5"
          >
            <CheckCheck aria-hidden="true" />
            Mark all as read
          </button>
        </div>
      )}
      <ul
        data-notification-scroll={scrollInside || undefined}
        className={cn(scrollInside && "max-h-96 overflow-y-auto overscroll-contain")}
      >
        {shown.map((n) => (
          <li key={n.id} className="border-b border-white/10 last:border-0">
            <Link
              href={placeHref(n)}
              // The place page scrolls to the item itself; without this,
              // Next.js scrolled the new page back to the top afterwards.
              scroll={false}
              onClick={() => {
                if (!n.read) void markRead(n.id);
                announceFocus(focusOf(n));
                onOpen();
              }}
              className="group flex gap-2.5 rounded-lg px-3 py-2.5 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-white"
            >
              <span
                aria-hidden="true"
                className={cn(
                  "mt-3 size-2 shrink-0 rounded-full",
                  n.read ? "bg-transparent" : "bg-amber-300",
                )}
              />
              <KindIcon kind={n.kind} />
              <span className="min-w-0">
                <span
                  className={cn(
                    "block text-sm wrap-anywhere transition-colors group-hover:text-amber-300",
                    n.read ? "text-white/75" : "text-white",
                  )}
                >
                  {sentence(n)}
                  {!n.read && <span className="sr-only"> (unread)</span>}
                </span>
                <time dateTime={n.created_at} className="text-xs text-white/60">
                  {timeAgo(n.created_at)}
                </time>
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {shown.length < data.notifications.length && (
        <div className="border-t border-white/10 px-3 py-2 text-center">
          <button
            type="button"
            onClick={() => setShowAll(true)}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded text-sm font-medium text-white/85 underline-offset-4 hover:text-amber-300 hover:underline focus-visible:outline-2 focus-visible:outline-white [&_svg]:size-3.5"
          >
            <ChevronDown aria-hidden="true" />
            See previous notifications
          </button>
        </div>
      )}
    </>
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

  // Live updates (ticket 104). Every notification is made by the database
  // in the same moment as a reply or a Helpful mark (035, 036), and removed
  // with them. So the bell listens to those public tables through Supabase
  // Realtime, the same anonymous "doorbell" the place pages use, and then
  // asks the backend for the list, which only ever holds the traveler's own
  // notifications. (Listening to the notifications table itself would need
  // the Realtime connection to carry the traveler's login; it never
  // registered, see ticket 104.) A short quiet time, so the bell lights up
  // at once. The bell is on every page (hidden on phones, but still there),
  // so this listens once.
  const queryClient = useQueryClient();
  const refetchNotifications = useCallback(
    () => void queryClient.invalidateQueries({ queryKey: notificationsKey(user.id) }),
    [queryClient, user.id],
  );
  useTableChanges(NOTIFYING_TABLES, refetchNotifications, { quietMs: 100 });

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
