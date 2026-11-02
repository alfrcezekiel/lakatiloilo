"use client";

import { CornerDownRight, MessageCircle, Send, Trash2, X } from "lucide-react";
import Link from "next/link";
import { type ReactNode, useId, useState } from "react";
import { pillButton } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { backendMessage, createReply, deleteReply, type Reply, type Traveler } from "@/lib/api";
import { travelerTypeLabels } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { loginToken } from "@/lib/login";
import { formatDate } from "@/components/ReviewsSection";

const MAX_REPLY = 300;
const small = "h-9 px-3.5 text-sm";
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
// reply (that reply's id), or none (null). Only one at a time.
type OpenForm = "review" | string | null;

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
// their own replies after an "are you sure?" step; deleting a reply
// deletes the answers under it too, and the step says so (ticket 87). No
// editing. Changes go straight into the page's copy of the reviews
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
  const [status, setStatus] = useState<string | null>(null);
  // The reply just posted: "Your reply is posted." shows under it. Null
  // shows the status line at the bottom (after a delete).
  const [postedId, setPostedId] = useState<string | null>(null);

  // Answers grouped by the reply they answer ("" = the review itself). The
  // list arrives oldest first: replies to the review stay that way, answers
  // to a reply are turned newest first. A reply whose parent is no longer
  // in the list is not shown.
  const answers = new Map<string, Reply[]>();
  for (const reply of replies) {
    const key = reply.parent_reply_id ?? "";
    const group = answers.get(key) ?? [];
    answers.set(key, key === "" ? [...group, reply] : [reply, ...group]);
  }

  // A reply and every answer under it, all levels deep: what the database
  // deletes together (028), so the page removes the same ones (ticket 87).
  const threadIds = (replyId: string): Set<string> => {
    const ids = new Set([replyId]);
    const visit = (id: string) => {
      for (const child of answers.get(id) ?? []) {
        ids.add(child.id);
        visit(child.id);
      }
    };
    visit(replyId);
    return ids;
  };

  const openFormFor = (target: OpenForm) => {
    setOpenForm(target);
    setText("");
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
      const parentId = openForm === "review" ? null : openForm;
      const saved = await createReply(token, reviewId, text.trim(), parentId);
      onChange([...replies, saved]);
      setText("");
      setOpenForm(null);
      setStatus("Your reply is posted.");
      setPostedId(saved.id);
    } catch (e) {
      setError(backendMessage(e) ?? "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (replyId: string) => {
    setDeletingId(replyId);
    setError(null);
    try {
      const token = await loginToken();
      if (!token) {
        setError("Please log in again, then try again.");
        return;
      }
      const deleted = await deleteReply(token, replyId);
      const gone = threadIds(replyId);
      onChange(replies.filter((r) => !gone.has(r.id)));
      // A form open under a deleted answer goes with it.
      if (openForm && openForm !== "review" && gone.has(openForm)) setOpenForm(null);
      setConfirmingId(null);
      setStatus(deleted.message);
      setPostedId(null);
    } catch (e) {
      setError(backendMessage(e) ?? "Something went wrong. Please try again.");
    } finally {
      setDeletingId(null);
    }
  };

  const form = (
    <ReplyForm
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
    const item = (
      <li
        key={reply.id}
        className={cn("border-l-2 border-white/25 py-0.5 pl-3.5", curved && curve)}
      >
        {replyingTo && (
          <p className="mb-0.5 flex min-w-0 items-center gap-1 text-xs text-white/70">
            <CornerDownRight aria-hidden="true" className="size-3.5 shrink-0" />
            <span className="wrap-anywhere">Replying to {replyingTo}</span>
          </p>
        )}
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
          <time dateTime={reply.created_at} className="text-white/65">
            {formatDate(reply.created_at)}
          </time>
        </div>
        <p className="mt-1 whitespace-pre-line wrap-anywhere text-sm leading-relaxed text-white/90">
          {reply.comment}
        </p>
        {status && postedId === reply.id && (
          <p role="status" className="mt-1 text-sm text-white/85">
            {status}
          </p>
        )}

        {user && (
          <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-2">
            {confirmingId === reply.id ? (
              <>
                <span className="text-sm">
                  {children.length > 0 ? "Delete this reply and its answers?" : "Delete this reply?"}
                </span>
                <button
                  type="button"
                  onClick={() => remove(reply.id)}
                  disabled={deletingId === reply.id}
                  className={cn(pillButton({ kind: "dangerSolid" }), small)}
                >
                  {deletingId === reply.id ? <Spinner /> : <Trash2 aria-hidden="true" />}
                  {deletingId === reply.id ? "Deleting…" : "Yes, delete"}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingId(null)}
                  disabled={deletingId === reply.id}
                  className={cn(pillButton({ kind: "glass" }), small)}
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                {openForm !== reply.id && (
                  <button
                    type="button"
                    onClick={() => openFormFor(reply.id)}
                    aria-label={`Reply to ${reply.replier_name}`}
                    className="inline-flex items-center gap-1.5 rounded text-sm font-medium text-white/85 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-white [&_svg]:size-3.5"
                  >
                    <MessageCircle aria-hidden="true" />
                    Reply
                  </button>
                )}
                {own && (
                  <button
                    type="button"
                    onClick={() => setConfirmingId(reply.id)}
                    className="rounded text-sm font-medium text-red-200 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-white"
                  >
                    Delete
                  </button>
                )}
              </>
            )}
          </div>
        )}

        {openForm === reply.id && <div className="mt-2">{form}</div>}

        {nested && children.length > 0 && (
          <ul className="mt-3 space-y-3 pl-1" aria-label={`Answers to ${reply.replier_name}`}>
            {children.flatMap((child) => renderReply(child, depth + 1, null))}
          </ul>
        )}
      </li>
    );
    if (nested) return [item];
    return [item, ...children.flatMap((child) => renderReply(child, depth + 1, reply.replier_name))];
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

// The small reply form: text box, Post reply, Cancel, a 0 / 300 counter
// and any refusal message. Used under the review and under a reply.
function ReplyForm({
  text,
  busy,
  error,
  onText,
  onPost,
  onCancel,
}: {
  text: string;
  busy: boolean;
  error: string | null;
  onText: (value: string) => void;
  onPost: () => void;
  onCancel: () => void;
}) {
  const fieldId = useId();
  const length = text.trim().length;
  return (
    <div className="space-y-2">
      <label htmlFor={fieldId} className="text-sm font-semibold">
        Your reply
      </label>
      <Textarea
        id={fieldId}
        value={text}
        onChange={(e) => onText(e.target.value)}
        rows={2}
        autoFocus
        placeholder="Answer a question or add a tip"
        className="border-white/25 bg-white/10 text-white placeholder:text-white/50"
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onPost}
            disabled={busy}
            className={cn(pillButton({ kind: "main" }), small)}
          >
            {busy ? <Spinner /> : <Send aria-hidden="true" />}
            {busy ? "Posting…" : "Post reply"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className={cn(pillButton({ kind: "glass" }), small)}
          >
            <X aria-hidden="true" />
            Cancel
          </button>
        </div>
        <span className={`text-xs ${length > MAX_REPLY ? "text-amber-200" : "text-white/70"}`}>
          {length} / {MAX_REPLY}
        </span>
      </div>
      {error && (
        <p role="alert" className="text-sm text-amber-200">
          {error}
        </p>
      )}
    </div>
  );
}
