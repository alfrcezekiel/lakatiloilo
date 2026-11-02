"use client";

import { MessageCircle, Send, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useId, useState } from "react";
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

// The replies under one review (review extras round, ticket 79): oldest
// first, each with the replier's name (linking to their profile), traveler
// type tag, text and date. Everyone sees them. A logged-in traveler gets a
// Reply button that opens a small form (up to 300 characters), and can
// delete their own replies after an "are you sure?" step. No replies to
// replies and no editing. Changes go straight into the page's copy of the
// reviews (onChange), so the list updates at once.
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
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const fieldId = useId();

  const length = text.trim().length;

  const post = async () => {
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
      const saved = await createReply(token, reviewId, text.trim());
      onChange([...replies, saved]);
      setText("");
      setOpen(false);
      setStatus("Your reply is posted.");
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
      onChange(replies.filter((r) => r.id !== replyId));
      setConfirmingId(null);
      setStatus(deleted.message);
    } catch (e) {
      setError(backendMessage(e) ?? "Something went wrong. Please try again.");
    } finally {
      setDeletingId(null);
    }
  };

  if (replies.length === 0 && !user) return null;

  return (
    <div className="space-y-3 border-t border-white/15 pt-3">
      {replies.length > 0 && (
        <ul className="space-y-3" aria-label="Replies">
          {replies.map((reply) => (
            <li key={reply.id} className="rounded-lg bg-white/5 px-3.5 py-2.5">
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
              {user && reply.user_id === user.id && (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {confirmingId === reply.id ? (
                    <>
                      <span className="text-sm">Delete this reply?</span>
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
                    <button
                      type="button"
                      onClick={() => setConfirmingId(reply.id)}
                      className="rounded text-sm font-medium text-red-200 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-white"
                    >
                      Delete
                    </button>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {status && (
        <p role="status" className="text-sm text-white/85">
          {status}
        </p>
      )}

      {user &&
        (open ? (
          <div className="space-y-2">
            <label htmlFor={fieldId} className="text-sm font-semibold">
              Your reply
            </label>
            <Textarea
              id={fieldId}
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                setError(null);
              }}
              rows={2}
              placeholder="Answer a question or add a tip"
              className="border-white/25 bg-white/10 text-white placeholder:text-white/50"
            />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={post}
                  disabled={busy}
                  className={cn(pillButton({ kind: "main" }), small)}
                >
                  {busy ? <Spinner /> : <Send aria-hidden="true" />}
                  {busy ? "Posting…" : "Post reply"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    setText("");
                    setError(null);
                  }}
                  disabled={busy}
                  className={cn(pillButton({ kind: "glass" }), small)}
                >
                  <X aria-hidden="true" />
                  Cancel
                </button>
              </div>
              <span
                className={`text-xs ${length > MAX_REPLY ? "text-amber-200" : "text-white/70"}`}
              >
                {length} / {MAX_REPLY}
              </span>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              setOpen(true);
              setStatus(null);
            }}
            className={cn(pillButton({ kind: "glass" }), small)}
          >
            <MessageCircle aria-hidden="true" />
            Reply
          </button>
        ))}

      {error && (
        <p role="alert" className="text-sm text-amber-200">
          {error}
        </p>
      )}
    </div>
  );
}
