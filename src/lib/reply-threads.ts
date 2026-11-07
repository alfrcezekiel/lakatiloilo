import type { Reply } from "@/lib/api";

// Plain helpers for the replies under one review, moved out of
// ReviewReplies.tsx in the thread care round's code review.

// Answers grouped by the reply they answer ("" = the review itself). The
// list arrives oldest first: replies to the review stay that way, answers
// to a reply are turned newest first. A reply whose parent is no longer
// in the list is not shown.
export function groupAnswers(replies: Reply[]) {
  const answers = new Map<string, Reply[]>();
  for (const reply of replies) {
    const key = reply.parent_reply_id ?? "";
    const group = answers.get(key) ?? [];
    answers.set(key, key === "" ? [...group, reply] : [reply, ...group]);
  }
  return answers;
}

// The replies after deleting one, the same way the database does it
// (delete_own_reply, supabase/sql/034, ticket 100): a reply with answers
// becomes "This reply was deleted"; one without is removed, and so is each
// deleted reply above it that is left with no answers. Also answers the
// set of removed ids, so forms open on them can close.
export function repliesAfterDelete(
  replies: Reply[],
  replyId: string,
): { list: Reply[]; gone: Set<string> } {
  const answers = groupAnswers(replies);
  const gone = new Set<string>();
  if ((answers.get(replyId) ?? []).length > 0) {
    const blank = {
      deleted: true,
      user_id: "",
      replier_name: "",
      traveler_type: null,
      comment: "",
      helpful_count: 0,
      liked_by_me: false,
    };
    const list = replies.map((r) => (r.id === replyId ? { ...r, ...blank } : r));
    return { list, gone };
  }
  const byId = new Map(replies.map((r) => [r.id, r]));
  let current = byId.get(replyId);
  while (current) {
    gone.add(current.id);
    const parent = current.parent_reply_id ? byId.get(current.parent_reply_id) : undefined;
    const stillAnswered = (answers.get(parent?.id ?? "") ?? []).some((c) => !gone.has(c.id));
    current = parent?.deleted && !stillAnswered ? parent : undefined;
  }
  return { list: replies.filter((r) => !gone.has(r.id)), gone };
}
