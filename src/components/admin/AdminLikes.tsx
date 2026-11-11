"use client";

import { ChevronDown, ThumbsUp, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { scheduleDelete, usePendingKeys } from "@/components/admin/PendingDeletes";
import { errorMessage } from "@/components/admin/admin-ui";
import { formatDate } from "@/components/ReviewsSection";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { adminDeletePaths, getAdminLikers, type AdminLikeKind, type AdminLiker } from "@/lib/api";
import { freshToken } from "@/lib/login";

// "N Helpful" on the Reviews screen (full admin management round, ticket
// 125): opens the list of travelers who marked a review or reply Helpful,
// newest first, display names only (never an email), each with Remove.
// Removing lowers the count on the site at once (the place pages listen
// for it) and the database removes its notification (036). With no marks,
// it is plain text.

const likersKey = (kind: AdminLikeKind, id: string) => ["admin", "likers", kind, id] as const;

// Undo (ticket 127): a removed mark waits as "like:<kind>:<id>:<user>".
const likeKey = (kind: AdminLikeKind, id: string, userId: string) => `like:${kind}:${id}:${userId}`;

// The names, without marks waiting for Undo.
function useShownLikers(kind: AdminLikeKind, id: string, likers: AdminLiker[] | undefined) {
  const pendingKeys = usePendingKeys();
  return (likers ?? []).filter((liker) => !pendingKeys.has(likeKey(kind, id, liker.user_id)));
}

// How many of this item's marks wait for Undo.
function useWaitingLikes(kind: AdminLikeKind, id: string) {
  const prefix = `like:${kind}:${id}:`;
  return [...usePendingKeys()].filter((key) => key.startsWith(prefix)).length;
}

// Who marked it, asked only while the list is open. Realtime asks again
// whenever a mark is added or removed (AdminReviews.tsx).
function useLikers(kind: AdminLikeKind, id: string, enabled: boolean) {
  return useQuery({
    queryKey: likersKey(kind, id),
    queryFn: async () => {
      const token = await freshToken();
      if (!token) throw new Error("Please log in again, then try again.");
      return getAdminLikers(token, kind, id);
    },
    enabled,
  });
}

function LikersList({
  kind,
  id,
  panelId,
  likers,
}: {
  kind: AdminLikeKind;
  id: string;
  panelId: string;
  likers: ReturnType<typeof useLikers>;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const shown = useShownLikers(kind, id, likers.data);

  const remove = async (liker: AdminLiker) => {
    setBusy(liker.user_id);
    setError(null);
    try {
      // Undo for 8 seconds first (ticket 127): the name leaves the list now
      // and the count drops; the mark is removed when the time runs out or
      // the admin leaves the page.
      await scheduleDelete({
        key: likeKey(kind, id, liker.user_id),
        label: `${liker.display_name}'s Helpful mark removed`,
        path: adminDeletePaths.like(kind, id, liker.user_id),
        // The counts on the review cards and replies change too.
        refresh: [likersKey(kind, id), ["admin", "reviews"], ["admin", "replies"]],
      });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div id={panelId} className="mt-2 w-full rounded-xl border border-white/20 p-3">
      {error && (
        <p role="alert" className="mb-2 text-sm font-medium text-amber-200">
          {error}
        </p>
      )}
      {likers.isPending ? (
        <>
          <p role="status" className="sr-only">
            Loading who marked it Helpful
          </p>
          <Skeleton className="h-12 w-full rounded-lg" />
        </>
      ) : likers.isError ? (
        <p role="alert" className="text-sm text-amber-200">
          {errorMessage(likers.error)}
        </p>
      ) : shown.length === 0 ? (
        <p className="text-sm text-white/75">Nobody has marked it Helpful now.</p>
      ) : (
        <ul className="space-y-1" aria-label="Who marked it Helpful">
          {shown.map((liker) => (
            <li key={liker.user_id} className="flex flex-wrap items-center justify-between gap-2 py-1">
              <span className="min-w-0">
                <Link
                  href={`/travelers/${liker.user_id}`}
                  className="font-semibold wrap-break-word hover:text-amber-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                  {liker.display_name}
                </Link>
                <span className="ml-2 text-sm text-white/70">{formatDate(liker.created_at)}</span>
              </span>
              <button
                type="button"
                onClick={() => void remove(liker)}
                disabled={busy !== null}
                aria-label={`Remove ${liker.display_name}'s Helpful mark`}
                className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-xl border border-red-300/70 px-3 text-sm font-semibold text-red-200 hover:border-red-200 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-default disabled:opacity-60"
              >
                {busy === liker.user_id ? <Spinner /> : <X aria-hidden="true" className="size-4" />}
                {busy === liker.user_id ? "Removing…" : "Remove"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// `layout` (optional) places the button and its list apart, so the review
// card can put the button in its row of buttons and the list under the
// whole row (team report 2026-11-11, uneven buttons on phones).
export function HelpfulCount({
  kind,
  id,
  count,
  layout,
}: {
  kind: AdminLikeKind;
  id: string;
  count: number;
  layout?: (button: React.ReactNode, list: React.ReactNode) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const likers = useLikers(kind, id, open);
  // While the list is open, the button counts the names in it; closed, it
  // shows the review's or reply's own count. Both are fresh from the
  // backend after every Realtime ring. (Fix 2026-11-11, team report: the
  // button kept an old number after Remove, so a traveler marking it again
  // still showed "1 Helpful" next to two names.)
  // Marks waiting for Undo (ticket 127) are not counted.
  const shown = useShownLikers(kind, id, likers.data);
  const waiting = useWaitingLikes(kind, id);
  const current = open && likers.data ? shown.length : Math.max(0, count - waiting);
  const panelId = `likers-${kind}-${id}`;

  // No marks: plain text, in a quiet box the size of the button so a row
  // of buttons stays even.
  const button =
    current === 0 && !open ? (
      <span className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-white/15 px-3 text-sm text-white/75">
        <ThumbsUp aria-hidden="true" className="size-4" />0 Helpful
      </span>
    ) : (
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={panelId}
        className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-white/30 px-3 text-center text-sm leading-tight font-semibold text-white/90 hover:border-amber-300 hover:text-amber-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        <ThumbsUp aria-hidden="true" className="size-4 shrink-0" />
        {current} Helpful
        <span className="sr-only">{open ? ": hide who marked it" : ": show who marked it"}</span>
        {/* The small arrow from 640 px; on phones the half is too narrow. */}
        <ChevronDown
          aria-hidden="true"
          className={`hidden size-4 shrink-0 transition-transform sm:block ${open ? "rotate-180" : ""}`}
        />
      </button>
    );
  const list = open ? <LikersList kind={kind} id={id} panelId={panelId} likers={likers} /> : null;
  if (layout) return layout(button, list);
  if (!list) return button;
  return (
    <div className="w-full">
      {button}
      {list}
    </div>
  );
}
