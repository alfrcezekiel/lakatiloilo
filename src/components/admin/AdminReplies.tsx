"use client";

import { Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { HelpfulCount } from "@/components/admin/AdminLikes";
import { scheduleDelete, usePendingKeys } from "@/components/admin/PendingDeletes";
import { ConfirmDeleteDialog } from "@/components/admin/ConfirmDeleteDialog";
import { errorMessage } from "@/components/admin/admin-ui";
import { formatDate } from "@/components/ReviewsSection";
import { Skeleton } from "@/components/ui/skeleton";
import { adminDeletePaths, getAdminReplies, type AdminReply } from "@/lib/api";
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
  // Waiting for Undo (ticket 127): shown as it will be once deleted.
  const waiting = usePendingKeys().has(`reply:${reply.id}`);

  const remove = async () => {
    setBusy(true);
    setError(null);
    try {
      // Undo for 8 seconds first (ticket 127); then the database's rule
      // (052) decides: with answers it stays as "This reply was deleted".
      await scheduleDelete({
        key: `reply:${reply.id}`,
        label: `${reply.replier_name}'s reply deleted`,
        path: adminDeletePaths.reply(reply.id),
        // The reply count on the review card changes too.
        refresh: [adminRepliesKey(reviewId), ["admin", "reviews"]],
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
          </div>
          <p className="mt-1 whitespace-pre-line wrap-break-word text-white/90">{reply.comment}</p>
          {/* N Helpful (opens who marked it, each with Remove; ticket 125)
              and Delete reply. Phones: two equal halves, the Helpful list
              under them (team report 2026-11-11: in deep answers Delete
              dropped under Helpful); from 640 px at the two ends. */}
          <HelpfulCount
            kind="reply"
            id={reply.id}
            count={reply.helpful_count}
            layout={(helpfulButton, likersList) => (
              <>
                <div className="mt-2 grid grid-cols-2 gap-2 sm:flex sm:items-center sm:justify-between">
                  {helpfulButton}
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setConfirming(true);
                    }}
                    aria-label={`Delete reply: ${reply.replier_name}'s reply`}
                    className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-red-300/70 px-3 text-center text-sm leading-tight font-semibold text-red-200 hover:border-red-200 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:gap-2 sm:px-4"
                  >
                    <Trash2 aria-hidden="true" className="size-4 shrink-0" />
                    {/* "Delete" on phones, where a deep answer is narrow. */}
                    <span className="sm:hidden">Delete</span>
                    <span className="hidden sm:inline">Delete reply</span>
                  </button>
                </div>
                {likersList}
              </>
            )}
          />
          <ConfirmDeleteDialog
            open={confirming}
            title="Delete this reply?"
            message={
              children.length > 0
                ? `${reply.replier_name}'s reply has answers, so it will stay in its place as "This reply was deleted" and the answers stay. Its Helpful marks are removed. You can Undo for 8 seconds.`
                : `${reply.replier_name}'s reply will be removed, with its Helpful marks. You can Undo for 8 seconds.`
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
