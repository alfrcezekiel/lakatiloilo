import { Skeleton } from "@/components/ui/skeleton";

// Three grey cards shaped like the place cards in the list sections
// (photo, name, two lines of description, address), shown while the home
// page waits for the backend. Same grid and card box as the real lists, so
// the real cards drop into the same spot. Accommodation cards also have a
// small "hotel"/"condominium" pill, so they pass withPill to match.
export function PlaceCardSkeletons({ withPill = false }: { withPill?: boolean }) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="overflow-hidden rounded-[var(--radius)] bg-white/15 backdrop-blur-md border border-white/25"
        >
          <Skeleton className="aspect-video w-full rounded-none" />
          <div className="p-6">
            <Skeleton className="h-6 w-2/3" />
          </div>
          <div className="space-y-3 px-6 pb-6">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
            <div className="space-y-2 pt-1">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            {withPill && <Skeleton className="h-6 w-24 rounded-full" />}
          </div>
        </div>
      ))}
    </div>
  );
}
