"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { Reply } from "@/lib/api";
import { useFocusTarget } from "@/lib/focus-target";

// Folding long threads under one review (ticket 101), moved out of
// ReviewReplies.tsx in the thread care round's code review so that file
// only draws the replies.
//
// - Every thread starts folded ("Show replies", changed 2026-11-07, team
//   request); each level opens on its own, and "Hide replies" folds it.
// - An open reply with more than SHOWN_ANSWERS answers shows the newest
//   ones, then "Show N more replies".
// - A new answer anywhere under a folded reply (posted here or arriving
//   live) opens it; a deleted one does not.
// - Opened from a notification about one of these replies ("?focus=reply-
//   <id>", ticket 103): that reply and every reply above it are open and
//   shown, even past "Show N more replies", so the page can scroll to it.

// A reply with more answers than this shows only the newest ones.
export const SHOWN_ANSWERS = 3;

export function useThreadFolding(replies: Reply[]) {
  // Every thread starts folded as of the newest reply when the page loaded
  // (loadedAt). foldedAt: reply id -> the time its thread was folded by the
  // traveler, or null when they opened it. A thread with an answer newer
  // than its fold time is open.
  const [loadedAt] = useState(() =>
    replies.reduce((newest, r) => (r.created_at > newest ? r.created_at : newest), ""),
  );
  const [foldedAt, setFoldedAt] = useState<Map<string, string | null>>(new Map());
  // Replies whose answers are all shown ("Show N more replies" clicked).
  const [showAll, setShowAll] = useState<Set<string>>(new Set());
  const router = useRouter();
  const pathname = usePathname();

  // The newest answer anywhere under each reply (all levels).
  const byId = new Map(replies.map((r) => [r.id, r]));
  const newestUnder = new Map<string, Reply>();
  for (const reply of replies) {
    let parent = reply.parent_reply_id ? byId.get(reply.parent_reply_id) : undefined;
    while (parent) {
      const newest = newestUnder.get(parent.id);
      if (!newest || newest.created_at < reply.created_at) newestUnder.set(parent.id, reply);
      parent = parent.parent_reply_id ? byId.get(parent.parent_reply_id) : undefined;
    }
  }
  const newestTime = (replyId: string) => newestUnder.get(replyId)?.created_at ?? "";
  const foldedIn = (map: Map<string, string | null>, replyId: string) => {
    const at = map.has(replyId) ? map.get(replyId) : loadedAt;
    return at !== null && at !== undefined && newestTime(replyId) <= at;
  };

  // The reply a notification opened, and every reply above it.
  const focus = useFocusTarget();
  const focusReply = focus?.startsWith("reply-")
    ? byId.get(focus.slice("reply-".length))
    : undefined;
  const onFocusPath = new Set<string>();
  for (let r = focusReply; r; r = r.parent_reply_id ? byId.get(r.parent_reply_id) : undefined) {
    onFocusPath.add(r.id);
  }

  const toggleFold = (replyId: string) => {
    // Hiding a thread the notification opened: the others on its path stay
    // open, this one folds, and "?focus" leaves the address.
    if (onFocusPath.has(replyId)) {
      setFoldedAt((current) => {
        const next = new Map(current);
        for (const id of onFocusPath) next.set(id, null);
        return next.set(replyId, newestTime(replyId));
      });
      router.replace(pathname, { scroll: false });
      return;
    }
    setFoldedAt((current) =>
      new Map(current).set(replyId, foldedIn(current, replyId) ? null : newestTime(replyId)),
    );
  };

  // For one reply and its answers (newest first): whether its thread is
  // folded, which answers to show, and how many are behind "Show N more".
  const answersOf = (replyId: string, children: Reply[]) => {
    const closed =
      children.length > 0 && !onFocusPath.has(replyId) && foldedIn(foldedAt, replyId);
    const allShown =
      showAll.has(replyId) ||
      children.slice(SHOWN_ANSWERS).some((child) => onFocusPath.has(child.id));
    const shown = closed ? [] : allShown ? children : children.slice(0, SHOWN_ANSWERS);
    return { closed, shown, more: closed ? 0 : children.length - shown.length };
  };

  const showMore = (replyId: string) => setShowAll((current) => new Set(current).add(replyId));

  return { focusReplyId: focusReply?.id, toggleFold, answersOf, showMore };
}
