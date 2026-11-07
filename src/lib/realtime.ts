"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

// Live updates round (ticket 89): Supabase Realtime as a doorbell.
//
// Supabase announces every new, changed or deleted row in the tables on its
// Realtime list (supabase/sql/029). This hook only listens for "a row in
// one of these tables changed" and then calls onChange, which asks the
// NestJS backend again. It never uses the rows Realtime sends: all data
// still comes through the backend (team decision, 2026-11-02, see
// .claude/rules/frontend.md).
//
// Only these tables may be listened to. review_reports is deliberately not
// one of them: nobody may read reports through the app.
export type LiveTable =
  | "destinations"
  | "accommodations"
  | "reviews"
  | "review_likes"
  | "review_replies"
  | "reply_likes";

// What to listen to: a table name means every change in it. The longer
// form narrows it to one kind of change and/or rows matching a filter that
// Supabase applies before announcing (for example "id=eq.<id>": only that
// row). Supabase cannot filter deletions, so a filter is only for INSERT
// and UPDATE (ticket 91).
export type LiveListen =
  | LiveTable
  | { table: LiveTable; event: "INSERT" | "UPDATE"; filter?: string }
  | { table: LiveTable; event: "DELETE" };

// Several changes close together (for example a review and its photo)
// ring the bell once, this long after the last one.
const QUIET_MS = 500;
// Catch-ups closer together than this count as one (ticket 92).
const CATCH_UP_GAP_MS = 5000;

// Each listener gets its own channel name, so two parts of a page never
// share (and close) each other's channel.
let channelCount = 0;

// Catching up (ticket 92). Changes made while the page was not listening
// (phone asleep, tab in the background, connection lost) are never
// announced later, so the bell also rings once:
//   - when Supabase Realtime reconnects after a drop (always), and
//   - when the tab comes back into view or the browser is back online,
//     unless catchUpOnReturn is false (the reviews already do that
//     themselves through TanStack Query).
// The half-second quiet time turns several of these into one request.
//
// quietMs shortens the quiet time where a change should show at once (the
// notifications bell, ticket 104).
export function useTableChanges(
  tables: readonly LiveListen[],
  onChange: () => void,
  { catchUpOnReturn = true, quietMs = QUIET_MS }: { catchUpOnReturn?: boolean; quietMs?: number } = {},
) {
  // The latest onChange, without listening again every time it changes.
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // A plain string, so the effect below only starts again when the list
  // really changes (not on every render).
  const listenList = JSON.stringify(tables);

  useEffect(() => {
    const supabase = createClient();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const ring = () => {
      clearTimeout(timer);
      timer = setTimeout(() => onChangeRef.current(), quietMs);
    };

    channelCount += 1;
    let channel = supabase.channel(`lakat-live-${channelCount}`);
    for (const listen of JSON.parse(listenList) as LiveListen[]) {
      const spec =
        typeof listen === "string"
          ? { event: "*" as const, schema: "public", table: listen }
          : { schema: "public", ...listen };
      channel = channel.on("postgres_changes", spec, ring);
    }
    // Coming back often fires several of these a few seconds apart (back
    // online, then Realtime reconnects), so catch-ups within 5 seconds of
    // the last one are skipped: one request, not several.
    let lastCatchUp = 0;
    const catchUp = () => {
      if (Date.now() - lastCatchUp < CATCH_UP_GAP_MS) return;
      lastCatchUp = Date.now();
      ring();
    };

    // The first "subscribed" is the normal start; any later one is a
    // reconnect after a drop, so catch up.
    let joinedBefore = false;
    channel.subscribe((status) => {
      if (status !== "SUBSCRIBED") return;
      if (joinedBefore) catchUp();
      joinedBefore = true;
    });

    const onVisible = () => {
      if (document.visibilityState === "visible") catchUp();
    };
    if (catchUpOnReturn) {
      document.addEventListener("visibilitychange", onVisible);
      window.addEventListener("online", catchUp);
    }

    // Leaving the page stops listening, so listeners never pile up.
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", catchUp);
      void supabase.removeChannel(channel);
    };
  }, [listenList, catchUpOnReturn, quietMs]);
}
