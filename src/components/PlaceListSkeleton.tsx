import { Skeleton } from "@/components/ui/skeleton";

// A whole list section while the home page waits for the backend: the
// section's real title, then three grey cards shaped like the place cards
// (photo, name, two lines of description, address). Same section, grid and
// card box as the real lists, so the real cards drop into the same spot.
// Accommodation cards also have a small "hotel"/"condominium" pill, so
// that list passes withPill to match.
export function PlaceListSkeleton({
  id,
  title,
  withPill = false,
}: {
  id?: string;
  title: string;
  withPill?: boolean;
}) {
  return (
    <section id={id} className="py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <h2 className="mb-8 text-3xl font-semibold text-white">{title}</h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="overflow-hidden rounded-(--radius) bg-white/15 border border-white/25"
            >
              <Skeleton className="aspect-video w-full rounded-none" />
              <div className="p-6">
                <Skeleton className="h-6 w-2/3" />
                {/* The rating line under the name. */}
                <Skeleton className="mt-1.5 h-5 w-28" />
              </div>
              <div className="space-y-3 px-6 pb-6">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-4/5" />
                <div className="space-y-2 pt-1">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                {withPill && <Skeleton className="h-6 w-24 rounded-full" />}
                {/* The amber "View details" button (44 px tall). */}
                <Skeleton className="h-11 w-40 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
