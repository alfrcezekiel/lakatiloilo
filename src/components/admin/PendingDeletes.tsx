"use client";

import { RotateCcw, X } from "lucide-react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useQueryClient, type QueryClient, type QueryKey } from "@tanstack/react-query";
import { adminSendDelete } from "@/lib/api";
import { freshToken, readLogin } from "@/lib/login";

// Undo after a delete (full admin management round, ticket 127).
//
// "Yes, delete" on a review, a reply or a place, and Remove on a Helpful
// mark, do not reach the backend at once. The item leaves every list on
// the dashboard (lists hide what is waiting here), and a line at the
// bottom says "Review deleted. Undo" for 8 seconds:
//   - Undo: the item is back, and nothing was ever sent, so travelers saw
//     no change at all;
//   - the time runs out, or the admin opens another dashboard page, logs
//     out, reloads or closes the tab: the delete is really sent. Closing
//     uses keepalive, so the browser finishes the request after the page
//     is gone.
// Travelers keep seeing the item until the delete is really sent.

export const UNDO_SECONDS = 8;

export type PendingDelete = {
  // What the lists hide while it waits, e.g. "review:<id>",
  // "reply:<id>", "place:<id>", "like:review:<id>:<userId>".
  key: string;
  // The line: "Review deleted", "Gehleeyaaa's Helpful mark removed".
  label: string;
  // The backend path of the DELETE (adminDeletePaths in api.ts).
  path: string;
  // Lists to ask again once it is really deleted.
  refresh: QueryKey[];
  // Login at the moment of the delete, for sending while the tab closes
  // (there is no time to ask for a fresh one then).
  token: string;
  until: number;
  timer: ReturnType<typeof setTimeout>;
  // On its way to the backend: never sent a second time (leaving the
  // page while the timer's send is still waiting for a login, for
  // example).
  sending?: boolean;
  // A failed send: the item is back, with this sentence.
  failed?: string;
};

// The waiting deletes, shared by every list on the page.
let pending: PendingDelete[] = [];
// The keys the lists hide, rebuilt only when something changes, so the
// lists get the same set until then.
let waitingKeys = new Set<string>();
const listeners = new Set<() => void>();
const changed = () => {
  pending = [...pending];
  waitingKeys = new Set(pending.filter((item) => !item.failed).map((item) => item.key));
  listeners.forEach((listen) => listen());
};
const subscribe = (listen: () => void) => {
  listeners.add(listen);
  return () => listeners.delete(listen);
};
let queryClientRef: QueryClient | null = null;

// The keys waiting now (failed ones are back in the lists).
export function usePendingKeys(): Set<string> {
  return useSyncExternalStore(subscribe, () => waitingKeys, () => waitingKeys);
}

const send = async (item: PendingDelete, closing: boolean) => {
  clearTimeout(item.timer);
  if (item.sending && !closing) return;
  item.sending = true;
  if (!closing) changed();
  try {
    const token = closing ? item.token : ((await freshToken()) ?? item.token);
    await adminSendDelete(token, item.path, closing);
    pending = pending.filter((p) => p !== item);
    changed();
    for (const key of item.refresh) void queryClientRef?.invalidateQueries({ queryKey: key });
  } catch (error) {
    // Not deleted: the item shows again, and the line says why.
    item.sending = false;
    item.failed = error instanceof Error ? error.message : "Something went wrong. Please try again.";
    changed();
  }
};

// Starts the 8 seconds. The item leaves the lists at once.
export async function scheduleDelete({
  key,
  label,
  path,
  refresh,
}: Pick<PendingDelete, "key" | "label" | "path" | "refresh">) {
  const token = await freshToken();
  if (!token) throw new Error("Please log in again, then try again.");
  const item: PendingDelete = {
    key,
    label,
    path,
    refresh,
    token,
    until: Date.now() + UNDO_SECONDS * 1000,
    timer: setTimeout(() => void send(item, false), UNDO_SECONDS * 1000),
  };
  pending = [...pending.filter((p) => p.key !== key), item];
  changed();
}

export function undoDelete(key: string) {
  const item = pending.find((p) => p.key === key);
  // Too late once it is on its way.
  if (!item || item.sending) return;
  clearTimeout(item.timer);
  pending = pending.filter((p) => p !== item);
  changed();
}

const dismiss = (item: PendingDelete) => {
  pending = pending.filter((p) => p !== item);
  changed();
};

// Sends every waiting delete now: when the admin opens another dashboard
// page or logs out (awaited), or the tab closes (keepalive).
export function flushDeletes(closing = false) {
  const waiting = pending.filter((p) => !p.failed);
  return Promise.all(waiting.map((item) => send(item, closing)));
}

function UndoLine({ item }: { item: PendingDelete }) {
  const [left, setLeft] = useState(() => Math.max(0, Math.ceil((item.until - Date.now()) / 1000)));
  useEffect(() => {
    if (item.failed) return;
    const tick = setInterval(() => setLeft(Math.max(0, Math.ceil((item.until - Date.now()) / 1000))), 250);
    return () => clearInterval(tick);
  }, [item.until, item.failed]);

  if (item.failed) {
    return (
      <li className="flex items-start gap-3 rounded-xl border border-amber-300/60 bg-teal-950 px-4 py-3 text-amber-100 shadow-2xl">
        <span role="alert" className="min-w-0 flex-1 wrap-break-word">
          {item.label}: not deleted. {item.failed}
        </span>
        <button
          type="button"
          onClick={() => dismiss(item)}
          aria-label="Dismiss"
          className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-lg hover:text-amber-300 focus-visible:outline-2 focus-visible:outline-white"
        >
          <X aria-hidden="true" className="size-4" />
        </button>
      </li>
    );
  }
  if (item.sending) {
    return (
      <li className="rounded-xl border border-white/30 bg-teal-950 px-4 py-3 text-white shadow-2xl">
        {item.label}. <span className="text-white/75">Deleting…</span>
      </li>
    );
  }
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-white/30 bg-teal-950 px-4 py-2 text-white shadow-2xl">
      <span className="min-w-0 flex-1 wrap-break-word">
        {item.label}. <span className="text-white/75">Deleting in {left} s.</span>
      </span>
      <button
        type="button"
        // A new Undo line gets the keyboard focus: the deleted item, and
        // often the button that deleted it, is gone.
        autoFocus
        onClick={() => undoDelete(item.key)}
        className="inline-flex min-h-11 shrink-0 cursor-pointer items-center gap-2 rounded-full border border-amber-300/80 px-4 text-sm font-semibold text-amber-200 hover:border-amber-200 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        <RotateCcw aria-hidden="true" className="size-4" />
        Undo
        <span className="sr-only">: {item.label}</span>
      </button>
    </li>
  );
}

// The Undo lines, bottom of the screen, on every dashboard page
// (AdminShell). Leaving this page sends what is waiting.
export function PendingDeletesHost() {
  const queryClient = useQueryClient();
  useEffect(() => {
    queryClientRef = queryClient;
  }, [queryClient]);
  const list = useSyncExternalStore(subscribe, () => pending, () => pending);

  // The focus was on an Undo line that went away (Undo, or the time ran
  // out): back to the page, not lost at the top of the document.
  const count = useRef(0);
  useEffect(() => {
    if (list.length < count.current && (!document.activeElement || document.activeElement === document.body)) {
      document.getElementById("admin-main")?.focus({ preventScroll: true });
    }
    count.current = list.length;
  }, [list]);

  useEffect(() => {
    // Closing the tab or reloading: send now, the browser finishes it.
    const closing = () => void flushDeletes(true);
    window.addEventListener("pagehide", closing);
    return () => {
      window.removeEventListener("pagehide", closing);
      // Opening another dashboard page: send now.
      if (readLogin()) void flushDeletes();
    };
  }, []);

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-4"
    >
      {list.length > 0 && (
        <ul className="pointer-events-auto w-full max-w-lg space-y-2">
          {list.map((item) => (
            <UndoLine key={item.key + item.until} item={item} />
          ))}
        </ul>
      )}
    </div>
  );
}
