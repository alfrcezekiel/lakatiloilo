"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { adminGlass } from "@/components/admin/AdminFrame";
import { AdminShell } from "@/components/admin/AdminShell";
import { ADMIN_FAQS_KEY, AdminLoadError, adminQuerySettings, errorMessage } from "@/components/admin/admin-ui";
import { ConfirmDeleteDialog } from "@/components/admin/ConfirmDeleteDialog";
import { FaqFormDialog } from "@/components/admin/FaqForm";
import { scheduleDelete, usePendingKeys } from "@/components/admin/PendingDeletes";
import { Skeleton } from "@/components/ui/skeleton";
import { adminDeletePaths, FAQ_SHOWN_LIMIT, getAdminFaqs, moveAdminFaq, type AdminFaq } from "@/lib/api";
import { FAQ_TOPICS, topicsOf } from "@/lib/faqs";
import { freshToken } from "@/lib/login";
import { cn } from "@/lib/utils";

// The FAQs screen (/admin/faqs, FAQs round, ticket 168): every question the
// home page can show, grouped by topic in its order, each marked Shown or
// Hidden, and how many are shown out of the 12 allowed. Add a question and
// Edit (with "Show on the home page") since ticket 169. Move up / Move
// down and Delete since ticket 172: Delete asks first, then waits 8
// seconds with Undo (PendingDeletes.tsx) before it is sent, like every
// delete on the dashboard; a deleted question does not go to the Trash.
// Hidden questions are read as the signed-in admin, so the database
// decides who sees them.

export function useAdminFaqs() {
  return useQuery({
    queryKey: ADMIN_FAQS_KEY,
    queryFn: async () => {
      const token = await freshToken();
      if (!token) throw new Error("Please log in again, then try again.");
      return getAdminFaqs(token);
    },
    ...adminQuerySettings(),
  });
}

const smallButton =
  "inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-full border px-4 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";

// A Move up / Move down arrow: 44 px tall; half the row on a phone, a
// 44 px square from sm: up.
const arrowButton =
  "inline-flex h-11 w-full cursor-pointer items-center justify-center rounded-full border border-white/40 hover:border-amber-300 hover:text-amber-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-default disabled:opacity-60 sm:w-11";
// Where an arrow would be, at the first or last, so the rest stay put.
const arrowSpace = "h-11 sm:w-11";

function FaqRow({
  faq,
  number,
  first,
  last,
  moving,
  onEdit,
  onMove,
  onDelete,
}: {
  faq: AdminFaq;
  // Its number in the list as shown (1, 2, 3).
  number: number;
  first: boolean;
  last: boolean;
  // A move is on its way: the arrows wait.
  moving: boolean;
  onEdit: () => void;
  onMove: (direction: "up" | "down") => void;
  onDelete: () => void;
}) {
  return (
    <li className="rounded-xl border border-white/20 p-4">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <p className="min-w-0 flex-1 font-semibold wrap-break-word">
          <span className="mr-2 text-white/60 tabular-nums">{String(number).padStart(2, "0")}</span>
          {faq.question}
        </p>
        <span
          className={cn(
            "shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-semibold",
            faq.is_shown ? "border-emerald-300/60 text-emerald-100" : "border-white/35 text-white/75",
          )}
        >
          {faq.is_shown ? "Shown" : "Hidden"}
        </span>
      </div>
      {/* The first lines of the answer, so the team can tell questions apart. */}
      <p className="mt-2 line-clamp-2 text-sm text-white/80 wrap-break-word whitespace-pre-line">{faq.answer}</p>
      {/* Phones: a grid of 2 equal columns, the arrows on one row and
          Edit and Delete on the next, so no button sits alone on a line
          (frontend rules). From sm: up, one row. */}
      <div className="mt-3 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
        {/* The first has no Move up and the last no Move down; an empty
            space keeps the other buttons where they always are. A question
            alone in its topic has no arrows at all. */}
        {!(first && last) && (
          <>
            {first ? (
              <span aria-hidden="true" className={arrowSpace} />
            ) : (
              <button
                type="button"
                data-faq-move={`${faq.id}:up`}
                onClick={() => onMove("up")}
                disabled={moving}
                aria-label={`Move up: "${faq.question}"`}
                className={arrowButton}
              >
                <ArrowUp aria-hidden="true" className="size-4" />
              </button>
            )}
            {last ? (
              <span aria-hidden="true" className={arrowSpace} />
            ) : (
              <button
                type="button"
                data-faq-move={`${faq.id}:down`}
                onClick={() => onMove("down")}
                disabled={moving}
                aria-label={`Move down: "${faq.question}"`}
                className={arrowButton}
              >
                <ArrowDown aria-hidden="true" className="size-4" />
              </button>
            )}
          </>
        )}
        <button
          type="button"
          onClick={onEdit}
          aria-label={`Edit "${faq.question}"`}
          className={cn(smallButton, "border-white/40 hover:border-amber-300 hover:text-amber-300")}
        >
          <Pencil aria-hidden="true" className="size-4" />
          Edit
        </button>
        <button
          type="button"
          onClick={onDelete}
          aria-label={`Delete "${faq.question}"`}
          className={cn(smallButton, "border-red-300/70 text-red-200 hover:border-red-200 hover:text-white")}
        >
          <Trash2 aria-hidden="true" className="size-4" />
          Delete
        </button>
      </div>
    </li>
  );
}

export function AdminFaqs() {
  const faqs = useAdminFaqs();

  if (faqs.isPending) return <FaqsSkeleton />;
  if (faqs.isError) {
    return <AdminLoadError what="the questions" error={faqs.error} onRetry={() => void faqs.refetch()} />;
  }

  return <AdminFaqList faqs={faqs.data} />;
}

// The list itself: the shown counter with Add a question, then each
// topic's questions with Edit.
export function AdminFaqList({ faqs: allFaqs }: { faqs: AdminFaq[] }) {
  const queryClient = useQueryClient();
  // A question waiting to be deleted (Undo) is already gone from the list,
  // but it is still in the database until the 8 seconds are over (code
  // review 2026-11-28). So the shown count includes it, and its topic's
  // arrows wait: the backend would swap with it.
  const waiting = usePendingKeys();
  const isWaiting = (f: AdminFaq) => waiting.has(`faq:${f.id}`);
  const faqs = allFaqs.filter((f) => !isWaiting(f));
  const shown = allFaqs.filter((f) => f.is_shown).length;
  const shownWaiting = allFaqs.filter((f) => f.is_shown && isWaiting(f)).length;
  const topicsWaiting = new Set(allFaqs.filter(isWaiting).map((f) => f.topic));
  // Delete: the question the pop-up asks about.
  const [deleting, setDeleting] = useState<AdminFaq | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  // A move is on its way (the arrows wait for it).
  const [moving, setMoving] = useState(false);
  const [moveError, setMoveError] = useState<string | null>(null);
  // The form: closed, open to add (null), or open to edit a question.
  const [form, setForm] = useState<{ faq: AdminFaq | null } | null>(null);
  // What the last save did, read out by screen readers too.
  const [status, setStatus] = useState("");

  const move = async (faq: AdminFaq, direction: "up" | "down") => {
    setMoving(true);
    setMoveError(null);
    try {
      const token = await freshToken();
      if (!token) throw new Error("Please log in again, then try again.");
      const list = await moveAdminFaq(token, faq.id, direction);
      queryClient.setQueryData<AdminFaq[]>(ADMIN_FAQS_KEY, list);
      setStatus(`"${faq.question}" moved ${direction}.`);
      // Once the row is in its new place (React has drawn it by the time
      // this timer runs, even in a background tab, unlike a frame
      // callback), the focus goes back to the same arrow, or to the other
      // one when it reached the top or bottom (its own arrow is gone then).
      const other = direction === "up" ? "down" : "up";
      setTimeout(() => {
        (
          document.querySelector<HTMLButtonElement>(`[data-faq-move="${faq.id}:${direction}"]`) ??
          document.querySelector<HTMLButtonElement>(`[data-faq-move="${faq.id}:${other}"]`)
        )?.focus();
      }, 0);
    } catch (e) {
      setMoveError(errorMessage(e));
    } finally {
      setMoving(false);
    }
  };

  const remove = async () => {
    if (!deleting) return;
    setDeleteBusy(true);
    setDeleteError(null);
    try {
      await scheduleDelete({
        key: `faq:${deleting.id}`,
        label: `"${deleting.question}" deleted`,
        path: adminDeletePaths.faq(deleting.id),
        refresh: [ADMIN_FAQS_KEY],
      });
      setDeleting(null);
    } catch (e) {
      setDeleteError(errorMessage(e));
    } finally {
      setDeleteBusy(false);
    }
  };
  return (
    <div className="space-y-5">
      <section
        aria-label="How many are shown"
        className={cn(adminGlass, "flex flex-wrap items-center justify-between gap-4 p-4 sm:p-5")}
      >
        <div className="min-w-0 flex-1 basis-60">
          <p className="text-lg font-semibold">
            {shown} of {FAQ_SHOWN_LIMIT} shown
          </p>
          <p className="mt-1 text-sm text-white/80">
            6 to 12 questions works best. Hidden questions are not on the home page.
          </p>
          {shownWaiting > 0 && (
            <p className="mt-1 text-sm text-amber-200">
              {shownWaiting === 1 ? "1 of them is" : `${shownWaiting} of them are`} waiting to be deleted (Undo).
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setForm({ faq: null })}
          className={cn(smallButton, "w-full border-white bg-white text-teal-900 hover:bg-white/90 sm:w-auto")}
        >
          <Plus aria-hidden="true" className="size-4" />
          Add a question
        </button>
      </section>

      <p role="status" className={cn("text-sm font-medium text-emerald-100 wrap-break-word", !status && "sr-only")}>
        {status}
      </p>
      {moveError && (
        <p role="alert" className="text-sm font-medium text-amber-200">
          {moveError}
        </p>
      )}

      {/* The built-in topics always, then each typed one (ticket 173). */}
      {topicsOf(faqs, true).map((topic, topicIndex) => {
        const inTopic = faqs.filter((f) => f.topic === topic.id);
        const topicWaits = topicsWaiting.has(topic.id);
        // By its place in the list: a typed topic can hold spaces, which
        // an id cannot.
        const headingId = `faq-topic-${topicIndex}`;
        return (
          <section
            key={topic.id}
            aria-labelledby={headingId}
            className={cn(adminGlass, "space-y-3 p-4 sm:p-5")}
          >
            <h2 id={headingId} className="text-lg font-semibold">
              {topic.name} <span className="font-normal text-white/70">({inTopic.length})</span>
            </h2>
            {topicWaits && inTopic.length > 1 && (
              <p className="text-sm text-amber-200">Move up and Move down wait until the Undo is over.</p>
            )}
            {inTopic.length === 0 ? (
              <p className="text-sm text-white/80">No questions in this topic yet.</p>
            ) : (
              <ol className="space-y-2">
                {inTopic.map((faq, index) => (
                  <FaqRow
                    key={faq.id}
                    faq={faq}
                    number={index + 1}
                    first={index === 0}
                    last={index === inTopic.length - 1}
                    moving={moving || topicWaits}
                    onEdit={() => setForm({ faq })}
                    onMove={(direction) => void move(faq, direction)}
                    onDelete={() => {
                      setDeleteError(null);
                      setDeleting(faq);
                    }}
                  />
                ))}
              </ol>
            )}
          </section>
        );
      })}

      <FaqFormDialog
        open={form !== null}
        faq={form?.faq ?? null}
        // Every question, with the ones waiting to be deleted: they still
        // count towards the 12 shown until they are really deleted.
        faqs={allFaqs}
        onClose={() => setForm(null)}
        onSaved={setStatus}
      />

      <ConfirmDeleteDialog
        open={deleting !== null}
        title={deleting ? `Delete "${deleting.question}"?` : ""}
        message="It leaves the home page. You can undo it for 8 seconds; after that it is gone for good (it does not go to the Trash)."
        busy={deleteBusy}
        error={deleteError}
        onConfirm={() => void remove()}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}

function FaqsSkeleton() {
  return (
    <div className="space-y-5">
      <p role="status" className="sr-only">
        Loading questions
      </p>
      <div className={cn(adminGlass, "p-4 sm:p-5")}>
        <Skeleton className="h-6 w-32" />
        <Skeleton className="mt-2 h-4 w-3/4" />
      </div>
      {FAQ_TOPICS.map((topic) => (
        <div key={topic.id} className={cn(adminGlass, "space-y-3 p-4 sm:p-5")}>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-20 w-full rounded-xl" />
        </div>
      ))}
    </div>
  );
}

// The page itself (/admin/faqs).
export function AdminFaqsPage() {
  useAdminFaqs();
  return (
    <AdminShell title="FAQs" skeleton={<FaqsSkeleton />}>
      <AdminFaqs />
    </AdminShell>
  );
}
