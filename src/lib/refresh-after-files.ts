"use client";

import { useCallback, useEffect, useRef } from "react";

// Refreshing a number that depends on files in Storage (the admin Overview's
// Storage used, ticket 167).
//
// When a video is removed, the backend changes the database row first and
// deletes the file right after. Supabase Realtime rings on the ROW, so a
// refresh at that moment can still count the file, and nothing rings when the
// file itself goes: the old MB stayed on screen (team report 2026-11-23).
// So each ring refreshes now, for the numbers that changed with the row, and
// once more a moment later, when the file is gone. Several rings close
// together share that one later refresh.
export const FILES_SETTLE_MS = 4000;

export function useRefreshAfterFiles(refresh: () => unknown) {
  const later = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Leaving the page cancels the later refresh.
  useEffect(() => () => clearTimeout(later.current), []);

  return useCallback(() => {
    void refresh();
    clearTimeout(later.current);
    later.current = setTimeout(() => void refresh(), FILES_SETTLE_MS);
  }, [refresh]);
}
