"use client";

import { ChevronDown, ChevronUp, CornerDownRight, MessageCircle } from "lucide-react";
import Link from "next/link";
import { type ReactNode, useState } from "react";
import { pillButton } from "@/components/ui/button";
import {
  backendMessage,
  createReply,
  deleteReply,
  updateReply,
  type Reply,
  type Traveler,
} from "@/lib/api";
import { travelerTypeLabels } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { loginToken } from "@/lib/login";
import { groupAnswers, repliesAfterDelete } from "@/lib/reply-threads";
import { useThreadFolding } from "@/lib/thread-folding";
import { formatDate } from "@/components/ReviewsSection";
import { HelpfulButton } from "@/components/HelpfulButton";
import { MAX_REPLY, ReplyForm, smallPill as small } from "@/components/ReplyForm";
import { ReplyActions, textLink } from "@/components/ReplyActions";
import { FromNotification, notifiedTint } from "@/components/FromNotification";

// Threads indent one step per level up to this many levels (ticket 86).
// Deeper answers stay at this indent and say who they answer, so a long
// conversation stays readable on a phone.
const MAX_INDENT = 3;
// The curved line that branches from the answered reply's line into a
// nested answer's name row (team request, 2026-11-02). A nested answer
// starts 20 px right of its parent's line (2 px line + 14 px padding +
// 4 px list padding), so the curve starts 20 px to the left and is 20 px
// wide; 12 px tall reaches the middle of the name row.
const curve =
  "relative before:absolute before:top-0 before:-left-5 before:h-3 before:w-5 before:rounded-bl-xl before:border-b-2 before:border-l-2 before:border-white/25";

// Which form is open: the one under the review ("review"), the one under a
// reply (that reply's id), the one editing a reply ("edit:" + its id,
// ticket 95), or none (null). Only one at a time.
type OpenForm = "review" | string | null;
const EDIT = "edit:";
// The amber frame around the content of the reply a notification opened:
// lightly rounded on all four corners (team request, 2026-11-07), a faint
// amber outline and a stronger amber line on the left, over the thread's
// white line.
const notifiedReply = cn(
  "-ml-4 rounded-lg border border-amber-300/40 border-l-2 border-l-amber-300 py-2 pr-3 pl-3.5",
  notifiedTint,
);

// The replies under one review (review extras round, ticket 79; threads
// from ticket 85). Replies to the review come first, oldest first (their
// Reply button is at the bottom). Each reply's answers show indented under
// it, newest first, so a new answer appears right where its form was
// (changed 2026-11-02, team request), joined by a thin line on the left.
// "Your reply is posted." shows under the new reply. After 3 levels the indent stops growing: deeper
// answers follow in the same list, each starting with "Replying to
// <name>" (ticket 86). Everyone sees them. A logged-in traveler gets a
// Reply button under the review and a small Reply link on every reply,
// each opening the same small form (up to 300 characters), and can delete
// their own replies after a "Delete this reply?" step. A deleted reply
// with answers stays as a grey "This reply was deleted", with no name,
// text or buttons, and its answers stay under it (ticket 100).
// Their own replies also get Edit, which opens the same form in place of
// the text, filled in; an edited reply shows "· edited" (ticket 95).
// Every reply has a small Helpful button, the same as reviews (ticket 96):
// logged out, or on your own reply, only the count.
// Long threads fold (ticket 101): "Show replies" / "Hide replies" and
// "Show N more replies", worked out in src/lib/thread-folding.ts, which
// also opens the thread around a reply a notification points to.
// Changes go straight into the page's copy of the reviews
// (onChange), so the list updates at once.
export function ReviewReplies({
  reviewId,
  replies,
  user,
  onChange,
}: {
  reviewId: string;
  replies: Reply[];
  user: Traveler | null;
  onChange: (replies: Reply[]) => void;
}) {
  const [openForm, setOpenForm] = useState<OpenForm>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  // A refused delete, shown next to that reply's confirm step, not in an
  // open reply form somewhere else (code review, 2026-11-02).
  const [deleteError, setDeleteError] = useState<{ replyId: string; message: string } | null>(
    null,
  );
  const [status, setStatus] = useState<string | null>(null);
  // The reply just posted: "Your reply is posted." shows under it. Null
  // shows the status line at the bottom (after a delete).
  const [postedId, setPostedId] = useState<string | null>(null);

  // Answers grouped by the reply they answer ("" = the review itself).
  const answers = groupAnswers(replies);
  const { focusReplyId, toggleFold, answersOf, showMore } = useThreadFolding(replies);

  const openFormFor = (target: OpenForm, startText = "") => {
    setOpenForm(target);
    setText(startText);
    setError(null);
    setStatus(null);
    setPostedId(null);
  };

  const post = async () => {
    const length = text.trim().length;
    if (length < 1 || length > MAX_REPLY) {
      setError(`Please write 1 to ${MAX_REPLY} characters.`);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const token = await loginToken();
      if (!token) {
        setError("Please log in again, then try again.");
        return;
      }
      if (openForm?.startsWith(EDIT)) {
        // Editing: the saved reply takes the old one's place, keeping its
        // Helpful count (the edit answer does not carry it).
        const saved = await updateReply(token, openForm.slice(EDIT.length), text.trim());
        onChange(
          replies.map((r) =>
            r.id === saved.id
              ? { ...saved, helpful_count: r.helpful_count, liked_by_me: r.liked_by_me }
              : r,
          ),
        );
        setStatus("Your reply is updated.");
        setPostedId(saved.id);
      } else {
        const parentId = openForm === "review" ? null : openForm;
        const saved = await createReply(token, reviewId, text.trim(), parentId);
        onChange([...replies, saved]);
        setStatus("Your reply is posted.");
        setPostedId(saved.id);
      }
      setText("");
      setOpenForm(null);
    } catch (e) {
      setError(backendMessage(e) ?? "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (replyId: string) => {
    setDeletingId(replyId);
    setDeleteError(null);
    try {
      const token = await loginToken();
      if (!token) {
        setDeleteError({ replyId, message: "Please log in again, then try again." });
        return;
      }
      const deleted = await deleteReply(token, replyId);
      const { list, gone } = repliesAfterDelete(replies, replyId);
      onChange(list);
      // A form open under (or editing) the deleted reply goes with it.
      gone.add(replyId);
      if (openForm && openForm !== "review" && gone.has(openForm.replace(EDIT, ""))) {
        setOpenForm(null);
      }
      setConfirmingId(null);
      setStatus(deleted.message);
      setPostedId(null);
    } catch (e) {
      setDeleteError({
        replyId,
        message: backendMessage(e) ?? "Something went wrong. Please try again.",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const form = (
    <ReplyForm
      editing={!!openForm?.startsWith(EDIT)}
      text={text}
      busy={busy}
      error={error}
      onText={(value) => {
        setText(value);
        setError(null);
      }}
      onPost={post}
      onCancel={() => {
        setOpenForm(null);
        setText("");
        setError(null);
      }}
    />
  );

  // One reply, its own Reply form (when open) and its answers. depth is 1
  // for a reply to the review. Up to MAX_INDENT the answers are nested (and
  // so indented) inside the reply; deeper, they come right after it in the
  // same list, naming who they answer (replyingTo).
  const renderReply = (reply: Reply, depth: number, replyingTo: string | null): ReactNode[] => {
    const own = user && reply.user_id === user.id;
    const children = answers.get(reply.id) ?? [];
    const nested = depth < MAX_INDENT;
    // Only answers drawn inside their parent get the curve; deeper ones sit
    // beside it and say "Replying to <name>" instead.
    const curved = depth > 1 && depth <= MAX_INDENT;
    const editing = openForm === EDIT + reply.id;
    // How its answers refer to it.
    const name = reply.deleted ? "a deleted reply" : reply.replier_name;
    // Folding (ticket 101): which answers show, and how many are hidden.
    const { closed, shown, more } = answersOf(reply.id, children);
    const moreLink = more > 0 && (
      <li key={`${reply.id}:more`} className="pl-3.5">
        <button
          type="button"
          onClick={() => showMore(reply.id)}
          className={textLink}
        >
          <ChevronDown aria-hidden="true" />
          Show {more} more {more === 1 ? "reply" : "replies"}
        </button>
      </li>
    );
    const foldLink = children.length > 0 && (
      <button
        type="button"
        onClick={() => toggleFold(reply.id)}
        aria-expanded={!closed}
        className={cn(textLink, "mt-1.5")}
      >
        {closed ? <ChevronDown aria-hidden="true" /> : <ChevronUp aria-hidden="true" />}
        {closed ? "Show replies" : "Hide replies"}
      </button>
    );
    const answerList = nested && shown.length > 0 && (
      <ul className="mt-3 space-y-3 pl-1" aria-label={`Answers to ${name}`}>
        {shown.flatMap((child) => renderReply(child, depth + 1, null))}
        {moreLink}
      </ul>
    );
    const deeper = nested
      ? []
      : [...shown.flatMap((child) => renderReply(child, depth + 1, name)), moreLink];
    const replyingLine = replyingTo && (
      <p className="mb-0.5 flex min-w-0 items-center gap-1 text-xs text-white/70">
        <CornerDownRight aria-hidden="true" className="size-3.5 shrink-0" />
        <span className="wrap-anywhere">Replying to {replyingTo}</span>
      </p>
    );
    // id: what a notification points to ("?focus=reply-<id>"); the page
    // scrolls to it.
    const lineClass = cn(
      "scroll-mt-28 border-l-2 border-white/25 py-0.5 pl-3.5",
      curved && curve,
    );
    // The reply a notification opened (ticket 103, change 2026-11-07, team
    // request): its own content (not the answers under it) gets an amber
    // line drawn over the white one (-ml-4 = 2 px line + 14 px padding), a
    // soft amber background and a "From your notification" label, for as
    // long as the page shows it.
    const notified = focusReplyId === reply.id;
    // A deleted reply keeps its place (and its answers) as a grey line
    // with no name, date, text or buttons (ticket 100).
    if (reply.deleted) {
      return [
        <li key={reply.id} id={`reply-${reply.id}`} className={lineClass}>
          {replyingLine}
          <p className="text-sm text-white/60 italic">This reply was deleted</p>
          <div>{foldLink}</div>
          {answerList}
        </li>,
        ...deeper,
      ];
    }
    const item = (
      <li key={reply.id} id={`reply-${reply.id}`} className={lineClass}>
        <div className={cn(notified && notifiedReply)}>
        {notified && <FromNotification />}
        {replyingLine}
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-sm">
          <span className="flex min-w-0 flex-wrap items-center gap-x-2 font-semibold">
            <Link
              href={`/travelers/${reply.user_id}`}
              className="rounded wrap-anywhere underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              {reply.replier_name}
            </Link>
            {reply.traveler_type && travelerTypeLabels[reply.traveler_type] && (
              <span className="font-normal text-white/75">
                · {travelerTypeLabels[reply.traveler_type]}
              </span>
            )}
          </span>
          <span className="text-white/65">
            <time dateTime={reply.created_at}>{formatDate(reply.created_at)}</time>
            {reply.updated_at && " · edited"}
          </span>
        </div>
        {editing ? (
          <div className="mt-2">{form}</div>
        ) : (
          <p className="mt-1 whitespace-pre-line wrap-anywhere text-sm leading-relaxed text-white/90">
            {reply.comment}
          </p>
        )}
        {!editing && (
          <div className="mt-1.5">
            <HelpfulButton
              item={reply}
              user={user}
              kind="reply"
              small
              onChange={(count, liked) =>
                onChange(
                  replies.map((r) =>
                    r.id === reply.id ? { ...r, helpful_count: count, liked_by_me: liked } : r,
                  ),
                )
              }
            />
          </div>
        )}
        {status && postedId === reply.id && (
          <p role="status" className="mt-1 text-sm text-white/85">
            {status}
          </p>
        )}

        {user && !editing && (
          <ReplyActions
            replierName={reply.replier_name}
            own={!!own}
            showReply={openForm !== reply.id}
            confirming={confirmingId === reply.id}
            deleting={deletingId === reply.id}
            error={deleteError?.replyId === reply.id ? deleteError.message : null}
            onReply={() => openFormFor(reply.id)}
            onEdit={() => openFormFor(EDIT + reply.id, reply.comment)}
            onAskDelete={() => {
              setConfirmingId(reply.id);
              setDeleteError(null);
            }}
            onConfirmDelete={() => remove(reply.id)}
            onCancelDelete={() => {
              setConfirmingId(null);
              setDeleteError(null);
            }}
          />
        )}

        {openForm === reply.id && <div className="mt-2">{form}</div>}

        </div>
        {foldLink && <div>{foldLink}</div>}
        {answerList}
      </li>
    );
    return [item, ...deeper];
  };

  const topLevel = answers.get("") ?? [];

  if (replies.length === 0 && !user) return null;

  return (
    <div className="space-y-3 border-t border-white/15 pt-3">
      {topLevel.length > 0 && (
        <ul className="space-y-3" aria-label="Replies">
          {topLevel.flatMap((reply) => renderReply(reply, 1, null))}
        </ul>
      )}

      {status && !postedId && (
        <p role="status" className="text-sm text-white/85">
          {status}
        </p>
      )}

      {user &&
        (openForm === "review" ? (
          form
        ) : (
          <button
            type="button"
            onClick={() => openFormFor("review")}
            className={cn(pillButton({ kind: "glass" }), small)}
          >
            <MessageCircle aria-hidden="true" />
            Reply
          </button>
        ))}

      {error && openForm === null && (
        <p role="alert" className="text-sm text-amber-200">
          {error}
        </p>
      )}
    </div>
  );
}
