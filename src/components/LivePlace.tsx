"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTableChanges, type LiveListen } from "@/lib/realtime";

// Live updates (ticket 91): keeps an open detail page's own details (name,
// photo, description, address, contact) up to date. Shows nothing.
//
// When this place is changed in Supabase, Realtime rings and the page asks
// the Next.js server to load it from the backend again (router.refresh).
// Only the server part is redone: the scroll position, a review being
// typed and open pop-ups stay as they are. If the place has been removed,
// the refreshed page shows the usual "not found" message.
//
// Edits are filtered to this one place. Supabase cannot filter deletions,
// so removing any place of this kind also refreshes the page once; nothing
// visible changes then.
export function LivePlace({
  placeType,
  placeId,
}: {
  placeType: "destination" | "accommodation";
  placeId: string;
}) {
  const router = useRouter();
  const listen = useMemo<LiveListen[]>(() => {
    const table = placeType === "destination" ? "destinations" : "accommodations";
    return [
      { table, event: "UPDATE", filter: `id=eq.${placeId}` },
      { table, event: "DELETE" },
    ];
  }, [placeType, placeId]);
  useTableChanges(listen, router.refresh);
  return null;
}
