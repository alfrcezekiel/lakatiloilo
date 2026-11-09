"use client";

import { MessageCircle, Trash2 } from "lucide-react";
import { pillButton } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { smallPill } from "@/components/ReplyForm";
import { cn } from "@/lib/utils";

// The small text links under a reply: Reply, Edit, Hide replies, …
export const textLink =
  "inline-flex items-center gap-1.5 rounded text-sm font-medium text-white/85 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-white [&_svg]:size-3.5";

// The row under one reply for a logged-in traveler (tickets 79, 87, 95,
// 100): Reply on every reply, and Edit and Delete on their own. Delete
// first asks "Delete this reply?" with "Yes, delete" and Cancel; a refused
// delete shows its message under the row. Moved out of ReviewReplies.tsx
// in the code review of commit 092153e; ReviewReplies keeps the state and
// passes in what to do.
export function ReplyActions({
  replierName,
  own,
  showReply,
  confirming,
  deleting,
  error,
  onReply,
  onEdit,
  onAskDelete,
  onConfirmDelete,
  onCancelDelete,
}: {
  replierName: string;
  // The reply is the logged-in traveler's own (Edit and Delete show).
  own: boolean;
  // False while this reply's own answer form is open.
  showReply: boolean;
  // The "Delete this reply?" step is showing, and the delete is running.
  confirming: boolean;
  deleting: boolean;
  // A refused delete's message, or null.
  error: string | null;
  onReply: () => void;
  onEdit: () => void;
  onAskDelete: () => void;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
}) {
  return (
    <>
      <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-2">
        {confirming ? (
          <>
            <span className="text-sm">Delete this reply?</span>
            <button
              type="button"
              onClick={onConfirmDelete}
              disabled={deleting}
              className={cn(pillButton({ kind: "dangerSolid" }), smallPill)}
            >
              {deleting ? <Spinner /> : <Trash2 aria-hidden="true" />}
              {deleting ? "Deleting…" : "Yes, delete"}
            </button>
            <button
              type="button"
              onClick={onCancelDelete}
              disabled={deleting}
              className={cn(pillButton({ kind: "glass" }), smallPill)}
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            {showReply && (
              <button
                type="button"
                onClick={onReply}
                aria-label={`Reply to ${replierName}`}
                className={textLink}
              >
                <MessageCircle aria-hidden="true" />
                Reply
              </button>
            )}
            {own && (
              <button
                type="button"
                onClick={onEdit}
                aria-label="Edit your reply"
                className="rounded text-sm font-medium text-white/85 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-white"
              >
                Edit
              </button>
            )}
            {own && (
              <button
                type="button"
                onClick={onAskDelete}
                className="rounded text-sm font-medium text-red-200 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-white"
              >
                Delete
              </button>
            )}
          </>
        )}
      </div>

      {error && (
        <p role="alert" className="mt-1.5 text-sm text-amber-200">
          {error}
        </p>
      )}
    </>
  );
}
