import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { BackLink, PlaceBody, tones } from "@/components/PlaceDetail";

const glassTile = "rounded-xl border border-white/20 bg-white/10 p-3 sm:p-4";

// What a destination or accommodation page looks like while it waits for
// the backend: the same photo, big title, tiles and side panel as the real
// page (src/components/PlaceDetail.tsx), with grey blocks where the text
// will go.
export function DetailPageSkeleton({
  kind,
}: {
  kind: "destination" | "accommodation";
}) {
  return (
    <main className={cn("min-h-screen", tones[kind].page)}>
      {/* The only thing screen readers hear while the page loads. */}
      <p role="status" className="sr-only">
        Loading places
      </p>

      {/* Cover photo with chips, title and address */}
      <div className="relative min-h-105 h-[62vh] w-full overflow-hidden">
        <Skeleton className="absolute inset-0 h-full w-full rounded-none" />

        {/* A real link, so travelers can leave before the page finishes. */}
        <div className="absolute top-5 left-4 sm:left-6">
          <BackLink />
        </div>

        <div className="absolute inset-x-0 bottom-0">
          <div className="mx-auto max-w-6xl px-4 pb-8 sm:px-6 lg:pb-10 lg:pr-100">
            <div className="flex gap-2 mb-4">
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-6 w-24 rounded-full" />
            </div>
            <Skeleton className="h-14 w-3/4 max-w-lg sm:h-16" />
            <Skeleton className="mt-4 h-5 w-1/2 max-w-xs" />
          </div>
        </div>
      </div>

      <PlaceBody
        main={
          <>
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className={glassTile}>
                  <Skeleton className="h-3 w-12" />
                  <Skeleton className="mt-2 h-5 w-3/4" />
                </div>
              ))}
            </div>
            <section className="space-y-3">
              <Skeleton className="h-8 w-28 mb-4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </section>
          </>
        }
        aside={
          <div className="rounded-2xl border border-white/30 bg-white/15 p-6 space-y-3">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-7 w-4/5" />
            <Skeleton className="mt-4 h-11 w-full" />
            <Skeleton className="h-11 w-full" />
          </div>
        }
        reviews={
          <section className="space-y-3">
            <Skeleton className="h-8 w-32 mb-4" />
            <Skeleton className="h-24 w-full rounded-xl" />
          </section>
        }
      />
    </main>
  );
}
