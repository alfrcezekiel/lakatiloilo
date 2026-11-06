"use client";

import { ThumbsUp } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { pillButton } from "@/components/ui/button";
import { backendMessage, setHelpful, type Traveler } from "@/lib/api";
import { loginToken } from "@/lib/login";

const travelers = (n: number) => `${n} traveler${n === 1 ? "" : "s"}`;

// A review's Helpful count as a line of text, for anyone who cannot mark
// it (logged out, or their own review) and on profile pages: "3 travelers
// found this helpful", or "No one has marked this helpful yet" for 0, so a
// visitor can tell the feature is there even before anyone has used it.
export function HelpfulCount({ count, className }: { count: number; className?: string }) {
  return (
    <p className={cn("flex items-center gap-1.5 text-sm text-white/75", className)}>
      <ThumbsUp aria-hidden="true" className="size-4 shrink-0" />
      {count > 0 ? `${travelers(count)} found this helpful` : "No one has marked this helpful yet"}
    </p>
  );
}

// "Helpful" on one review (profiles & likes round, ticket 72).
//
// - Logged in, on someone else's review: a glass "Helpful · 3" button that
//   turns amber when this traveler has marked it, and back when clicked
//   again. aria-pressed tells screen readers whether it is marked.
// - Logged out, or on the traveler's own review: only the count, as text
//   (HelpfulCount above).
//
// The backend answers the new count, which goes straight into the page's
// copy of the reviews (onChange), so the count updates at once.
//
// Replies use it too (ticket 96): kind "reply", and a smaller button.
export function HelpfulButton({
  item,
  user,
  onChange,
  kind = "review",
  small = false,
}: {
  // The review or reply: who wrote it and its Helpful state.
  item: { id: string; user_id: string; helpful_count?: number; liked_by_me?: boolean };
  user: Traveler | null;
  onChange: (count: number, liked: boolean) => void;
  kind?: "review" | "reply";
  small?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const count = item.helpful_count ?? 0;
  const liked = item.liked_by_me ?? false;

  if (!user || item.user_id === user.id) {
    return <HelpfulCount count={count} className={small ? "text-xs" : undefined} />;
  }

  const toggle = async () => {
    setBusy(true);
    setError(null);
    try {
      const token = await loginToken();
      if (!token) {
        setError("Please log in again, then try again.");
        return;
      }
      const state = await setHelpful(token, item.id, !liked, kind);
      onChange(state.helpful_count, state.liked);
    } catch (e) {
      setError(backendMessage(e) ?? "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        aria-pressed={liked}
        className={cn(pillButton({ kind: liked ? "main" : "glass" }), small ? "h-8 px-3 text-xs" : "px-4 text-sm")}
      >
        <ThumbsUp aria-hidden="true" className={cn(liked && "fill-current")} />
        Helpful · {count}
        <span className="sr-only">
          {liked ? ", you marked this helpful" : `, ${travelers(count)} found this helpful`}
        </span>
      </button>
      {error && (
        <p role="alert" className="text-sm text-amber-200">
          {error}
        </p>
      )}
    </div>
  );
}
