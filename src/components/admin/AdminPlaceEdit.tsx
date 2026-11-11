"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { AdminShell } from "@/components/admin/AdminShell";
import { adminGlass } from "@/components/admin/AdminFrame";
import { PlaceForm } from "@/components/admin/PlaceForm";
import { AdminLoadError, adminQuerySettings } from "@/components/admin/admin-ui";
import { Skeleton } from "@/components/ui/skeleton";
import { getAdminPlace } from "@/lib/api";
import { freshToken } from "@/lib/login";
import { cn } from "@/lib/utils";

// The Edit place page (/admin/places/<destination|accommodation>/<id>,
// ticket 112): loads the place, then shows the place form (PlaceForm.tsx)
// filled in, or a skeleton, a load error or "not found". The form itself
// moved to PlaceForm.tsx in the code review of the photo credits round
// (2026-11-11), when this file passed 580 lines.

// The place being edited. Called by the page itself too, so the request
// starts at once (see adminQuerySettings).
function usePlace() {
  const params = useParams<{ type: string; id: string }>();
  return useQuery({
    queryKey: ["admin", "place", params.type, params.id],
    queryFn: async () => {
      const token = await freshToken();
      if (!token) throw new Error("Please log in again, then try again.");
      return getAdminPlace(token, params.type, params.id);
    },
    // Keep the form as the admin left it while they type.
    refetchOnWindowFocus: false,
    ...adminQuerySettings(),
  });
}

export function PlaceEditSkeleton() {
  return (
    <div className="space-y-3">
      <p role="status" className="sr-only">
        Loading the place
      </p>
      <Skeleton className="h-128 w-full rounded-2xl" />
    </div>
  );
}

// "All places", above the form and its skeleton.
export const backToPlaces = (
  <Link
    href="/admin/places"
    className="mb-4 inline-flex min-h-11 items-center gap-2 font-semibold text-white/90 hover:text-amber-300 focus-visible:outline-2 focus-visible:outline-white"
  >
    <ArrowLeft aria-hidden="true" className="size-4" />
    All places
  </Link>
);

function PlaceEditData() {
  const params = useParams<{ type: string; id: string }>();
  const place = usePlace();

  if (place.isPending) return <PlaceEditSkeleton />;
  if (place.isError) {
    return <AdminLoadError what="this place" error={place.error} onRetry={() => void place.refetch()} />;
  }
  if (!place.data) {
    return (
      <div role="alert" className={cn(adminGlass, "p-6")}>
        <p className="font-semibold">We couldn&apos;t find that place.</p>
        <p className="mt-1 text-white/85">
          It may have a mistyped address. Go back to the list and pick it again.
        </p>
      </div>
    );
  }
  // Keyed by the place, so opening another place starts a fresh form.
  return <PlaceForm key={`${params.type}-${params.id}`} place={place.data} />;
}

export function AdminPlaceEdit() {
  usePlace();
  return (
    <AdminShell
      title="Edit place"
      skeleton={
        <>
          {backToPlaces}
          <PlaceEditSkeleton />
        </>
      }
    >
      {backToPlaces}
      <PlaceEditData />
    </AdminShell>
  );
}
