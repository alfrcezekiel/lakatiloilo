"use client";

import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getNotifications,
  markNotificationsRead,
  type Traveler,
  type TravelerNotification,
} from "@/lib/api";
import { loginToken } from "@/lib/login";
import { useTableChanges } from "@/lib/realtime";

// The data side of the notifications bell (thread care round, tickets
// 102–106): fetching the traveler's notifications, marking them read,
// keeping them live, and the words and links each one shows. Moved out of
// NotificationsBell.tsx in the code review of commit 092153e; the screens
// are NotificationsBell.tsx and NotificationList.tsx.

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
export function useMarkRead(user: Traveler) {
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

// Live updates (ticket 104). Every notification is made by the database
// in the same moment as a reply or a Helpful mark (035, 036), and removed
// with them. So this listens to those public tables through Supabase
// Realtime, the same anonymous "doorbell" the place pages use, and then
// asks the backend for the list, which only ever holds the traveler's own
// notifications. (Listening to the notifications table itself would need
// the Realtime connection to carry the traveler's login; it never
// registered, see ticket 104.) A short quiet time, so the bell lights up
// at once. Called once per page, by the bell.
export function useLiveNotifications(user: Traveler) {
  const queryClient = useQueryClient();
  const refetchNotifications = useCallback(
    () => void queryClient.invalidateQueries({ queryKey: notificationsKey(user.id) }),
    [queryClient, user.id],
  );
  useTableChanges(NOTIFYING_TABLES, refetchNotifications, { quietMs: 100 });
}

// What the place page should show (change 2026-11-07, team request): the
// reply itself (its thread opens and it glows for a moment), or the review
// for a Helpful mark on a review. It goes in the address as "?focus=" (see
// src/lib/focus-target.ts).
export const focusOf = (n: TravelerNotification) =>
  n.reply_id ? `reply-${n.reply_id}` : `review-${n.review_id}`;

// The place page, at that reply or review.
export const placeHref = (n: TravelerNotification) =>
  `/${n.place_type === "destination" ? "destinations" : "accommodations"}/${n.place_id}?focus=${focusOf(n)}`;

// "just now", "5 min ago", "3 h ago", "2 days ago", then the date.
export function timeAgo(iso: string) {
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
export function sentence(n: TravelerNotification) {
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
