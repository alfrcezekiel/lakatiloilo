"use client";

import { useEffect, useRef } from "react";

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
// one of them: only admins may read reports, so the Overview listens to
// report_signals instead (045).
export type LiveTable =
  | "destinations"
  | "accommodations"
  | "reviews"
  | "review_likes"
  | "review_replies"
  | "reply_likes"
  // A review was hidden or shown again (ticket 109, supabase/sql/041).
  // Realtime cannot announce that on reviews itself, because a hidden
  // review is no longer readable by the people who should hear about it.
  | "review_visibility_signals"
  // A review's photos (ticket 113, supabase/sql/044).
  | "review_photos"
  // Reports were added or removed (supabase/sql/045). Holds only a time:
  // the dashboard Overview listens to it instead of review_reports, which
  // stays off the Realtime list.
  | "report_signals"
  // The team added or deleted a category or kind (ticket 117,
  // supabase/sql/047).
  | "place_categories";

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
    let timer: ReturnType<typeof setTimeout> | undefined;
    const ring = () => {
      clearTimeout(timer);
      timer = setTimeout(() => onChangeRef.current(), quietMs);
    };

    // Coming back often fires several of these a few seconds apart (back
    // online, then Realtime reconnects), so catch-ups within 5 seconds of
    // the last one are skipped: one request, not several.
    let lastCatchUp = 0;
    const catchUp = () => {
      if (Date.now() - lastCatchUp < CATCH_UP_GAP_MS) return;
      lastCatchUp = Date.now();
      ring();
    };

    // The Supabase browser code is big (about 67 KB compressed) and only
    // needed for this doorbell, which starts after the page is on screen.
    // So it is downloaded here, on demand, instead of with the page's first
    // scripts, which a phone must download and run before it can answer a
    // tap (ticket 158, Lighthouse TBT and LCP). If the page is left before
    // it arrives, nothing is opened.
    let stopped = false;
    let stopListening = () => {};
    void import("@/lib/supabase/client").then(({ createClient }) => {
      if (stopped) return;
      const supabase = createClient();
      channelCount += 1;
      let channel = supabase.channel(`lakat-live-${channelCount}`);
      for (const listen of JSON.parse(listenList) as LiveListen[]) {
        const spec =
          typeof listen === "string"
            ? { event: "*" as const, schema: "public", table: listen }
            : { schema: "public", ...listen };
        channel = channel.on("postgres_changes", spec, ring);
      }

      // The first "subscribed" is the normal start; any later one is a
      // reconnect after a drop, so catch up.
      let joinedBefore = false;
      channel.subscribe((status) => {
        if (status !== "SUBSCRIBED") return;
        if (joinedBefore) catchUp();
        joinedBefore = true;
      });
      stopListening = () => void supabase.removeChannel(channel);
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
      stopped = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", catchUp);
      stopListening();
    };
  }, [listenList, catchUpOnReturn, quietMs]);
}
