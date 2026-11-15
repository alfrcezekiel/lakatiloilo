"use client";

import { Clock, Flag, ImageIcon, MessageSquare, RotateCcw, Star, ThumbsUp, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { adminGlass } from "@/components/admin/AdminFrame";
import { ConfirmDeleteDialog } from "@/components/admin/ConfirmDeleteDialog";
import { AdminShell } from "@/components/admin/AdminShell";
import {
  ADMIN_REVIEWS_KEY,
  ADMIN_TRASH_KEY,
  AdminLoadError,
  REPORTS_KEY,
  adminQuerySettings,
  errorMessage,
  plural,
} from "@/components/admin/admin-ui";
import { ADMIN_CATEGORIES_KEY } from "@/components/admin/AdminCategories";
import { ADMIN_PLACES_KEY } from "@/components/admin/AdminPlaces";
import { adminRepliesKey } from "@/components/admin/AdminReplies";
import { formatDate } from "@/components/ReviewsSection";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { deleteAdminTrashItemForGood, getAdminTrash, restoreAdminTrashItem, type TrashedItem } from "@/lib/api";
import { freshToken } from "@/lib/login";
import { cn } from "@/lib/utils";

// The Trash (/admin/trash, admin extras round, tickets 147 and 148): what
// admins deleted, newest first. A review, reply or place waits here for 30
// days, out of every other list and page, and Restore brings it back as it
// was: a review with its replies, Helpful likes, photos and reports; a
// reply in its thread; a place with the reviews that went with it, and
// its photos. Delete for good (after a pop-up) removes it at once, with
// its photo files; after 30 days it goes by itself, when an admin next
// opens the Trash (ticket 149).

export function useAdminTrash() {
  return useQuery({
    queryKey: ADMIN_TRASH_KEY,
    queryFn: async () => {
      const token = await freshToken();
      if (!token) throw new Error("Please log in again, then try again.");
      return getAdminTrash(token);
    },
    ...adminQuerySettings(),
  });
}

const DAY = 24 * 60 * 60 * 1000;
const daysLeft = (expiresAt: string) => Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / DAY));
const placePath = (type: string, id: string) =>
  `/${type === "accommodation" ? "accommodations" : "destinations"}/${id}`;
const linkClass =
  "wrap-break-word underline-offset-4 hover:text-amber-300 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";

// How each item is named in its Restore button and in the line after it.
function nameOf(item: TrashedItem) {
  if (item.kind === "review") return `${item.reviewer_name}'s review of ${item.place_name}`;
  if (item.kind === "reply") return `${item.replier_name}'s reply on ${item.place_name}`;
  return item.name;
}

// What Restore waits for, if anything: a reply's review or a review's
// place that is in the Trash too (ticket 148). The button stays, and the
// backend answers with the same sentence if it is pressed.
function waitsFor(item: TrashedItem) {
  if (item.kind === "reply" && item.review_in_trash) return "Its review is in the Trash too. Restore the review first.";
  if (item.kind === "review" && item.place_in_trash) return "Its place is in the Trash too. Restore the place first.";
  return null;
}

const KIND_LABEL = { review: "Review", reply: "Reply" } as const;

// The Delete for good pop-up's sentence: what goes with the item (ticket
// 149). It cannot be undone, so it says so.
function forGoodMessage(item: TrashedItem) {
  if (item.kind === "place") {
    return `${item.name} is deleted for good with ${plural(item.review_count, "review")} (and their replies, Helpful marks, reports and photos), its ${plural(item.photo_count, "photo")} and their credits. This cannot be undone.`;
  }
  if (item.kind === "reply") {
    return item.answer_count > 0
      ? `${item.replier_name}'s reply is deleted for good. It has answers, so travelers keep seeing "This reply was deleted" in its place, and the answers stay. This cannot be undone.`
      : `${item.replier_name}'s reply is deleted for good, with its Helpful marks. This cannot be undone.`;
  }
  return `${item.reviewer_name}'s review is deleted for good, with ${item.reply_count} ${item.reply_count === 1 ? "reply" : "replies"}, its Helpful marks, ${plural(item.report_count, "report")} and ${plural(item.photo_count, "photo")}. This cannot be undone.`;
}

// What the item was: a review (stars and text), a reply (its text, under
// whose review) or a place (its photo, name and what comes back with it).
function ItemBody({ item }: { item: TrashedItem }) {
  if (item.kind === "place") {
    return (
      <div className="flex items-start gap-3">
        {item.photo_url && (
          <img src={item.photo_url} alt="" className="size-16 shrink-0 rounded-xl border border-white/15 object-cover" />
        )}
        <div className="min-w-0">
          <p className="font-semibold wrap-break-word">{item.name}</p>
          <ul aria-label="What goes back with it" className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/75">
            <li className="flex items-center gap-1">
              <Star aria-hidden="true" className="size-3.5" />
              {plural(item.review_count, "review")}
            </li>
            <li className="flex items-center gap-1">
              <ImageIcon aria-hidden="true" className="size-3.5" />
              {plural(item.photo_count, "photo")}
            </li>
          </ul>
        </div>
      </div>
    );
  }
  if (item.kind === "reply") {
    return (
      <>
        <p className="font-semibold wrap-break-word">
          {item.replier_name}
          <span className="font-normal text-white/80"> on {item.reviewer_name}&apos;s review of </span>
          <Link href={placePath(item.place_type, item.place_id)} className={linkClass}>
            {item.place_name}
          </Link>
        </p>
        <p className="mt-2 line-clamp-3 text-sm leading-relaxed whitespace-pre-line wrap-break-word text-white/85">
          {item.comment}
        </p>
        <ul aria-label="What goes back with it" className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/75">
          <li className="flex items-center gap-1">
            <MessageSquare aria-hidden="true" className="size-3.5" />
            {item.answer_count} {item.answer_count === 1 ? "answer under it" : "answers under it"}
          </li>
          <li className="flex items-center gap-1">
            <ThumbsUp aria-hidden="true" className="size-3.5" />
            {plural(item.like_count, "Helpful mark")}
          </li>
        </ul>
      </>
    );
  }
  return (
    <>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <p className="font-semibold wrap-break-word">
          {item.reviewer_name}
          <span className="font-normal text-white/80"> on </span>
          <Link href={placePath(item.place_type, item.place_id)} className={linkClass}>
            {item.place_name}
          </Link>
        </p>
        <span className="flex items-center gap-0.5 text-amber-300" aria-label={`${item.rating} out of 5 stars`}>
          {Array.from({ length: 5 }, (_, i) => (
            <Star key={i} aria-hidden="true" className={cn("size-3.5", i < item.rating ? "fill-amber-300" : "opacity-40")} />
          ))}
        </span>
      </div>
      <p className="mt-2 line-clamp-3 text-sm leading-relaxed whitespace-pre-line wrap-break-word text-white/85">
        {item.comment}
      </p>
      <ul aria-label="What goes back with it" className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/75">
        <li className="flex items-center gap-1">
          <MessageSquare aria-hidden="true" className="size-3.5" />
          {item.reply_count} {item.reply_count === 1 ? "reply" : "replies"}
        </li>
        <li className="flex items-center gap-1">
          <ImageIcon aria-hidden="true" className="size-3.5" />
          {plural(item.photo_count, "photo")}
        </li>
        <li className="flex items-center gap-1">
          <Flag aria-hidden="true" className="size-3.5" />
          {plural(item.report_count, "report")}
        </li>
      </ul>
    </>
  );
}

function TrashedItemCard({ item, onDone }: { item: TrashedItem; onDone: (message: string) => void }) {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const left = daysLeft(item.expires_at);
  const name = nameOf(item);
  const waiting = waitsFor(item);
  const label = item.kind === "place" ? (item.place_type === "accommodation" ? "Accommodation" : "Destination") : KIND_LABEL[item.kind];

  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // It leaves the Trash, and the counts that included it are asked again.
  const leaveTrash = () => {
    queryClient.setQueryData<TrashedItem[]>(ADMIN_TRASH_KEY, (list) =>
      list?.filter((t) => !(t.kind === item.kind && t.id === item.id)),
    );
    void queryClient.invalidateQueries({ queryKey: ADMIN_TRASH_KEY });
    void queryClient.invalidateQueries({ queryKey: ADMIN_CATEGORIES_KEY });
  };

  // Delete for good (ticket 149), after the pop-up. No Undo: the Trash
  // was the second chance.
  const deleteForGood = async () => {
    setDeleting(true);
    setDeleteError(null);
    try {
      const token = await freshToken();
      if (!token) throw new Error("Please log in again, then try again.");
      await deleteAdminTrashItemForGood(token, item);
      setConfirming(false);
      leaveTrash();
      onDone(`${name}: deleted for good.`);
    } catch (e) {
      setDeleteError(errorMessage(e));
      setDeleting(false);
    }
  };

  const restore = async () => {
    setBusy(true);
    setError(null);
    try {
      const token = await freshToken();
      if (!token) throw new Error("Please log in again, then try again.");
      const { message } = await restoreAdminTrashItem(token, item);
      leaveTrash();
      // It is back in these lists and counts.
      const keys: readonly (readonly string[])[] = [
        ADMIN_TRASH_KEY,
        ADMIN_REVIEWS_KEY,
        REPORTS_KEY,
        ADMIN_PLACES_KEY,
        ADMIN_CATEGORIES_KEY,
        ["admin", "overview"],
        ...(item.kind === "reply" ? [adminRepliesKey(item.review_id)] : []),
      ];
      for (const key of keys) void queryClient.invalidateQueries({ queryKey: key });
      onDone(`${name}: ${message}`);
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  };

  return (
    <li className="rounded-2xl border border-white/20 p-4 sm:p-5">
      <span className="mb-2 inline-block rounded-full border border-white/25 px-2.5 py-0.5 text-xs font-semibold text-white/85">
        {label}
      </span>
      <ItemBody item={item} />
      {waiting && <p className="mt-2 text-sm text-amber-200">{waiting}</p>}
      {/* Phones: the line, then Restore on its own full-width row. */}
      <div className="mt-3 flex flex-col gap-3 border-t border-white/15 pt-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-start gap-1.5 text-sm text-white/80">
          <Clock aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <span>
            Deleted {formatDate(item.trashed_at)} by {item.trashed_by_name}.{" "}
            <span className={cn("font-semibold", left <= 3 ? "text-amber-200" : "text-white")}>
              {left === 0 ? "Deleted for good today." : `${plural(left, "day")} left.`}
            </span>
          </span>
        </p>
        {/* Phones: Restore and Delete for good as two equal columns. */}
        <div className="grid shrink-0 grid-cols-2 gap-2 sm:flex sm:items-center">
          <button
            type="button"
            onClick={() => void restore()}
            disabled={busy}
            aria-label={`Restore ${name}`}
            className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-full border border-emerald-300/70 px-4 text-sm font-semibold text-emerald-100 hover:border-emerald-200 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-default disabled:opacity-60 sm:px-5"
          >
            {busy ? <Spinner /> : <RotateCcw aria-hidden="true" className="size-4 shrink-0" />}
            {busy ? "Restoring…" : "Restore"}
          </button>
          <button
            type="button"
            onClick={() => {
              setDeleteError(null);
              setConfirming(true);
            }}
            aria-label={`Delete for good: ${name}`}
            className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-full border border-red-300/70 px-4 text-center text-sm leading-tight font-semibold text-red-200 hover:border-red-200 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:px-5"
          >
            <Trash2 aria-hidden="true" className="size-4 shrink-0" />
            Delete for good
          </button>
        </div>
      </div>
      <ConfirmDeleteDialog
        open={confirming}
        title={`Delete ${item.kind === "place" ? item.name : `this ${item.kind}`} for good?`}
        message={forGoodMessage(item)}
        busy={deleting}
        error={deleteError}
        onConfirm={() => void deleteForGood()}
        onClose={() => setConfirming(false)}
      />
      {error && (
        <p role="alert" className="mt-2 text-sm font-medium text-amber-200">
          {error}
        </p>
      )}
    </li>
  );
}

function TrashSkeleton() {
  return (
    <div className="space-y-3">
      <p role="status" className="sr-only">
        Loading the Trash
      </p>
      <Skeleton className="h-16 w-full rounded-2xl" />
      <Skeleton className="h-40 w-full rounded-2xl" />
      <Skeleton className="h-40 w-full rounded-2xl" />
    </div>
  );
}

function AdminTrash() {
  const trash = useAdminTrash();
  const [done, setDone] = useState<string | null>(null);

  if (trash.isPending) return <TrashSkeleton />;
  if (trash.isError) {
    return <AdminLoadError what="the Trash" error={trash.error} onRetry={() => void trash.refetch()} />;
  }
  const items = trash.data;
  return (
    <div className="space-y-4">
      <section aria-label="About the Trash" className={cn(adminGlass, "flex items-start gap-3 p-4 sm:p-5")}>
        <Trash2 aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-amber-300" />
        <p className="text-sm leading-relaxed text-white/85">
          Reviews, replies and places you delete wait here for 30 days, out of the site and every other list. Restore
          brings one back exactly as it was: a review with its replies, Helpful marks, photos and reports; a reply in
          its thread; a place with its reviews and photos. Delete for good removes it now. After 30 days it is
          deleted for good by itself.
        </p>
      </section>
      {done && (
        <p role="status" className="text-sm text-emerald-100">
          {done}
        </p>
      )}
      {items.length === 0 ? (
        <div className={cn(adminGlass, "p-6 text-center")}>
          <p className="font-semibold">The Trash is empty.</p>
          <p className="mt-1 text-sm text-white/80">What you delete on the Reviews, Reports and Places screens comes here.</p>
        </div>
      ) : (
        <>
          <p className="text-sm text-white/80">{plural(items.length, "item")} in the Trash, newest first.</p>
          <ul className={cn(adminGlass, "space-y-3 p-3 sm:p-4")}>
            {items.map((item) => (
              <TrashedItemCard key={`${item.kind}:${item.id}`} item={item} onDone={setDone} />
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

export function AdminTrashPage() {
  useAdminTrash();
  return (
    <AdminShell title="Trash" skeleton={<TrashSkeleton />}>
      <AdminTrash />
    </AdminShell>
  );
}
