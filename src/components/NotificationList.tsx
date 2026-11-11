"use client";

import {
  CheckCheck,
  ChevronDown,
  CornerDownRight,
  type LucideIcon,
  MessageCircle,
  ThumbsUp,
} from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import type { Traveler, TravelerNotification } from "@/lib/api";
import { announceFocus } from "@/lib/focus-target";
import {
  focusOf,
  placeHref,
  sentence,
  timeAgo,
  useMarkRead,
  useNotifications,
} from "@/lib/notifications";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

// The list of notifications inside the bell's dropdown and the phone menu
// (tickets 102–106), moved out of NotificationsBell.tsx in the code review
// of commit 092153e.

// The list shows this many newest notifications first; "See previous
// notifications" shows the rest (up to the 20 the backend sends).
const FIRST_SHOWN = 6;

// Each kind has its own small icon, so replies, answers and Helpful marks
// are told apart at a glance. Helpful marks use the Helpful button's thumb,
// in amber.
const kindIcon: Record<TravelerNotification["kind"], { icon: LucideIcon; label: string }> = {
  review_reply: { icon: MessageCircle, label: "Reply" },
  reply_answer: { icon: CornerDownRight, label: "Answer" },
  review_like: { icon: ThumbsUp, label: "Helpful" },
  reply_like: { icon: ThumbsUp, label: "Helpful" },
};

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
export function NotificationList({
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
              className="group flex gap-2.5 rounded-lg px-3 py-2.5 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-white"
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
