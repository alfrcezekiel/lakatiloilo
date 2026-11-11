"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";
import { ADMIN_CATEGORIES_KEY } from "@/components/admin/AdminCategories";
import { ConfirmDeleteDialog } from "@/components/admin/ConfirmDeleteDialog";
import { scheduleDelete } from "@/components/admin/PendingDeletes";
import { errorMessage } from "@/components/admin/admin-ui";
import { adminDeletePaths, type AdminPlaceType } from "@/lib/api";
import { cn } from "@/lib/utils";

// "Delete place" (ticket 121; pop-up since the team's request of
// 2026-11-10): a button that opens a confirmation pop-up saying how many
// reviews go with the place, with "Yes, delete" and "Cancel". It sits on
// each row of the Places list, next to Edit (the Edit form has no Delete,
// team request 2026-11-10). Since ticket 127, "Yes, delete" first offers
// Undo for 8 seconds (PendingDeletes.tsx); the place leaves the list at
// once.

export type DeletablePlace = {
  type: AdminPlaceType;
  id: string;
  name: string;
  review_count: number;
};

export function DeletePlaceButton({ place, className }: { place: DeletablePlace; className?: string }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reviews = place.review_count;

  const remove = async () => {
    setBusy(true);
    setError(null);
    try {
      await scheduleDelete({
        key: `place:${place.id}`,
        label: `${place.name} deleted, with its reviews and photos`,
        path: adminDeletePaths.place(place.type, place.id),
        refresh: [
          ["admin", "places"],
          ["admin", "place", place.type, place.id],
          ADMIN_CATEGORIES_KEY,
          ["admin", "reviews"],
          ["admin", "overview"],
        ],
      });
      setOpen(false);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
        aria-label={`Delete ${place.name}`}
        className={cn(
          "inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-full border border-red-300/70 px-5 text-sm font-semibold text-red-100 hover:border-red-200 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white",
          className,
        )}
      >
        <Trash2 aria-hidden="true" className="size-4" />
        Delete
      </button>
      <ConfirmDeleteDialog
        open={open}
        title={`Delete ${place.name} for good?`}
        message={`${
          reviews === 0
            ? "It has no reviews."
            : `${reviews === 1 ? "Its 1 review" : `Its ${reviews} reviews`} will be deleted too, with their replies, Helpful marks, reports and photos.`
        } Its photo is deleted too. You can Undo for 8 seconds.`}
        busy={busy}
        error={error}
        onConfirm={() => void remove()}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
