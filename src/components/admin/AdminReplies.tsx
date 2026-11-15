"use client";

import { Eye, EyeOff, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { HelpfulCount } from "@/components/admin/AdminLikes";
import { scheduleDelete, usePendingKeys } from "@/components/admin/PendingDeletes";
import { ConfirmDeleteDialog } from "@/components/admin/ConfirmDeleteDialog";
import { ADMIN_TRASH_KEY, errorMessage } from "@/components/admin/admin-ui";
import { formatDate } from "@/components/ReviewsSection";
import { Skeleton } from "@/components/ui/skeleton";
import { adminDeletePaths, adminShowReply, getAdminReplies, type AdminReply } from "@/lib/api";
import { freshToken } from "@/lib/login";
import { cn } from "@/lib/utils";

// A review's replies on the Reviews screen (full admin management round,
// ticket 124), opened with "Show replies". The thread as travelers see it:
// answers sit under the reply they answer. Each reply has Delete reply
// (a pop-up first). It follows the writer's own rule (supabase/sql/052):
// a reply with answers stays as "This reply was deleted", one without is
// removed. Open place pages show the change by themselves (Realtime).

// Its own cache label, not under ["admin", "reviews"] (those are the
// review lists).
export const adminRepliesKey = (reviewId: string) => ["admin", "replies", reviewId] as const;

function ReplyItem({
  reply,
  answers,
  reviewId,
}: {
  reply: AdminReply;
  answers: Map<string | null, AdminReply[]>;
  reviewId: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const children = answers.get(reply.id) ?? [];
  const pendingKeys = usePendingKeys();
  // Waiting for Undo (ticket 127): shown as it will be once deleted.
  const waiting = pendingKeys.has(`reply:${reply.id}`);
  // Hide it waiting for its Undo (ticket 140): shown as hidden already.
  const hiding = pendingKeys.has(`hide:reply:${reply.id}`);
  const hidden = reply.hidden || hiding;
  const queryClient = useQueryClient();
  const [visibilityBusy, setVisibilityBusy] = useState(false);
  const [visibilityLine, setVisibilityLine] = useState<string | null>(null);
  const [visibilityError, setVisibilityError] = useState<string | null>(null);

  // Hide it (ticket 140): with the same 8-second Undo as Delete; then the
  // database moves the text where only the team can read it. Show it puts
  // it back at once (it is its own undo).
  const toggleHidden = async () => {
    setVisibilityBusy(true);
    setVisibilityError(null);
    setVisibilityLine(null);
    try {
      if (hidden) {
        const token = await freshToken();
        if (!token) throw new Error("Please log in again, then try again.");
        const { message } = await adminShowReply(token, reply.id);
        await queryClient.invalidateQueries({ queryKey: adminRepliesKey(reviewId) });
        setVisibilityLine(message);
      } else {
        await scheduleDelete({
          key: `hide:reply:${reply.id}`,
          label: `${reply.replier_name}'s reply hidden`,
          path: adminDeletePaths.hideReply(reply.id),
          method: "POST",
          refresh: [adminRepliesKey(reviewId)],
        });
      }
    } catch (e) {
      setVisibilityError(errorMessage(e));
    } finally {
      setVisibilityBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    setError(null);
    try {
      // Undo for 8 seconds first (ticket 127); then it goes to the Trash
      // (061, ticket 148): with answers it shows as "This reply was
      // deleted", without it leaves the thread.
      await scheduleDelete({
        key: `reply:${reply.id}`,
        label: `${reply.replier_name}'s reply moved to the Trash`,
        path: adminDeletePaths.reply(reply.id),
        // The reply count on the review card, and the Trash, change too.
        refresh: [adminRepliesKey(reviewId), ["admin", "reviews"], ADMIN_TRASH_KEY],
      });
      setConfirming(false);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  // No answers: it simply leaves the thread while it waits.
  if (waiting && children.length === 0) return null;

  return (
    <li>
      {reply.deleted || waiting ? (
        <p className="rounded-xl border border-white/10 px-4 py-2 text-sm text-white/60 italic">
          This reply was deleted
        </p>
      ) : (
        <div className="rounded-xl border border-white/20 px-3 py-3 sm:px-4">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {reply.replier_id ? (
              <Link
                href={`/travelers/${reply.replier_id}`}
                className="font-semibold wrap-break-word hover:text-amber-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                {reply.replier_name}
              </Link>
            ) : (
              <span className="font-semibold wrap-break-word">{reply.replier_name}</span>
            )}
            <span className="text-sm text-white/75">
              {formatDate(reply.created_at)}
              {reply.updated_at && " · edited"}
            </span>
            {hidden && (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-300/70 px-2 py-0.5 text-xs font-semibold text-amber-200">
                <EyeOff aria-hidden="true" className="size-3.5 shrink-0" />
                Hidden
              </span>
            )}
          </div>
          <p className={cn("mt-1 whitespace-pre-line wrap-break-word", hidden ? "text-white/65" : "text-white/90")}>
            {reply.comment}
          </p>
          {hidden && (
            <p className="mt-1 text-xs text-white/70">
              Travelers see &ldquo;This reply was hidden by the Lakat Iloilo team.&rdquo; Its writer still sees it.
            </p>
          )}
          {/* N Helpful (opens who marked it, each with Remove; ticket 125)
              Hide it / Show it (ticket 140) and Delete reply. Phones: three
              equal columns, the Helpful list under them (team report
              2026-11-11: in deep answers Delete dropped under Helpful);
              from 640 px Helpful on the left, the two buttons on the right. */}
          <HelpfulCount
            kind="reply"
            id={reply.id}
            count={reply.helpful_count}
            layout={(helpfulButton, likersList) => (
              <>
                <div className="mt-2 grid grid-cols-3 gap-2 sm:flex sm:items-center">
                  {helpfulButton}
                  <button
                    type="button"
                    onClick={() => void toggleHidden()}
                    disabled={visibilityBusy}
                    aria-label={`${hidden ? "Show" : "Hide"} reply: ${reply.replier_name}'s reply`}
                    className={cn(
                      "inline-flex min-h-11 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-xl border px-2 text-center text-sm leading-tight font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-default disabled:opacity-60 sm:ml-auto sm:flex-row sm:gap-2 sm:px-4",
                      hidden
                        ? "border-emerald-300/70 text-emerald-200 hover:border-emerald-200 hover:text-white"
                        : "border-white/40 text-white hover:border-amber-300 hover:text-amber-300",
                    )}
                  >
                    {hidden ? (
                      <Eye aria-hidden="true" className="size-4 shrink-0" />
                    ) : (
                      <EyeOff aria-hidden="true" className="size-4 shrink-0" />
                    )}
                    {hidden ? "Show it" : "Hide it"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setConfirming(true);
                    }}
                    aria-label={`Delete reply: ${reply.replier_name}'s reply`}
                    className="inline-flex min-h-11 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-xl border border-red-300/70 px-2 text-center text-sm leading-tight font-semibold text-red-200 hover:border-red-200 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:flex-row sm:gap-2 sm:px-4"
                  >
                    <Trash2 aria-hidden="true" className="size-4 shrink-0" />
                    {/* "Delete" on phones, where a deep answer is narrow. */}
                    <span className="sm:hidden">Delete</span>
                    <span className="hidden sm:inline">Delete reply</span>
                  </button>
                </div>
                {visibilityError && (
                  <p role="alert" className="mt-2 text-sm font-medium text-amber-200">
                    {visibilityError}
                  </p>
                )}
                {visibilityLine && (
                  <p role="status" className="mt-2 text-sm text-emerald-100">
                    {visibilityLine}
                  </p>
                )}
                {likersList}
              </>
            )}
          />
          <ConfirmDeleteDialog
            open={confirming}
            title="Delete this reply?"
            message={
              children.length > 0
                ? `${reply.replier_name}'s reply goes to the Trash for 30 days, where you can restore it. It has answers, so travelers see "This reply was deleted" in its place and the answers stay. You can Undo for 8 seconds.`
                : `${reply.replier_name}'s reply goes to the Trash for 30 days, where you can restore it with its Helpful marks. You can Undo for 8 seconds.`
            }
            busy={busy}
            error={error}
            onConfirm={() => void remove()}
            onClose={() => setConfirming(false)}
          />
        </div>
      )}
      {/* Each level of answers is indented less on phones (14 px, from 24),
          so deep answers keep room for their buttons. */}
      {children.length > 0 && (
        <ul className="mt-2 ml-1.5 space-y-2 border-l border-white/20 pl-2 sm:ml-5 sm:pl-4">
          {children.map((child) => (
            <ReplyItem key={child.id} reply={child} answers={answers} reviewId={reviewId} />
          ))}
        </ul>
      )}
    </li>
  );
}

export function AdminReplies({ reviewId, id }: { reviewId: string; id: string }) {
  const replies = useQuery({
    queryKey: adminRepliesKey(reviewId),
    queryFn: async () => {
      const token = await freshToken();
      if (!token) throw new Error("Please log in again, then try again.");
      return getAdminReplies(token, reviewId);
    },
  });

  // Replies by the reply they answer (null: answering the review).
  const answers = new Map<string | null, AdminReply[]>();
  for (const reply of replies.data ?? []) {
    const list = answers.get(reply.parent_reply_id) ?? [];
    list.push(reply);
    answers.set(reply.parent_reply_id, list);
  }
  const top = answers.get(null) ?? [];

  return (
    <div id={id} className="mt-3 space-y-2">
      {replies.isPending ? (
        <>
          <p role="status" className="sr-only">
            Loading replies
          </p>
          <Skeleton className="h-20 w-full rounded-xl" />
        </>
      ) : replies.isError ? (
        <div role="alert" className="flex flex-wrap items-center gap-3 text-sm text-amber-200">
          {errorMessage(replies.error)}
          <button
            type="button"
            onClick={() => void replies.refetch()}
            className="min-h-11 cursor-pointer rounded-xl border border-white/40 px-4 font-semibold text-white hover:border-amber-300 hover:text-amber-300 focus-visible:outline-2 focus-visible:outline-white"
          >
            Try again
          </button>
        </div>
      ) : top.length === 0 ? (
        <p className="text-sm text-white/75">No replies now.</p>
      ) : (
        <ul className={cn("space-y-2", replies.isFetching && "opacity-80")}>
          {top.map((reply) => (
            <ReplyItem key={reply.id} reply={reply} answers={answers} reviewId={reviewId} />
          ))}
        </ul>
      )}
    </div>
  );
}
