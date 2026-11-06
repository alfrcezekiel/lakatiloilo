"use client";

import { Check, Send, X } from "lucide-react";
import { useId } from "react";
import { pillButton } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

// The longest reply, the same as the backend and the database (025).
export const MAX_REPLY = 300;
// The small pill size used for the reply buttons.
export const smallPill = "h-9 px-3.5 text-sm";

// The small reply form: text box, Post reply (Save changes when editing),
// Cancel, a 0 / 300 counter and any refusal message. Used under the
// review, under a reply, and in place of a reply being edited.
export function ReplyForm({
  editing,
  text,
  busy,
  error,
  onText,
  onPost,
  onCancel,
}: {
  editing: boolean;
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
            className={cn(pillButton({ kind: "main" }), smallPill)}
          >
            {busy ? <Spinner /> : editing ? <Check aria-hidden="true" /> : <Send aria-hidden="true" />}
            {busy ? (editing ? "Saving…" : "Posting…") : editing ? "Save changes" : "Post reply"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className={cn(pillButton({ kind: "glass" }), smallPill)}
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
