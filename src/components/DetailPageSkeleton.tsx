import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { BackLink, PlaceBody, tones } from "@/components/PlaceDetail";
import { pageWidth } from "@/components/place-width";

const glass = "rounded-[22px] border border-white/20 bg-white/10";

// What a destination or accommodation page looks like while it waits for
// the backend: the same Back link, rounded photo, quick-facts strip, tabs
// and side panel as the real page (src/components/PlaceDetail.tsx, glass
// detail pages round), with grey blocks where the text will go.
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

      {/* The top of the page, with the real Back link at the top-left so
          travelers can leave before the page finishes. */}
      <div className={cn("sticky top-0 z-50 flex items-center gap-3 pt-4", pageWidth)}>
        <BackLink className={cn("border-white/25 hover:bg-black/45", tones[kind].bar)} />
        <Skeleton className="hidden h-11 w-72 rounded-full lg:block" />
      </div>

      {/* Rounded cover photo with chips, title and address */}
      <div className={cn("mt-5", pageWidth)}>
        <div className="relative h-110 overflow-hidden rounded-[32px] border border-white/20 sm:h-150">
          <Skeleton className="absolute inset-0 h-full w-full rounded-none" />
          <div className="absolute inset-x-0 bottom-0 px-5 pb-24 sm:px-12 sm:pb-28">
            <div className="mb-4 flex gap-2">
              <Skeleton className="h-6 w-24 rounded-full" />
              <Skeleton className="h-6 w-24 rounded-full" />
            </div>
            <Skeleton className="h-14 w-3/4 max-w-xl sm:h-20" />
            <Skeleton className="mt-4 h-5 w-1/2 max-w-xs" />
          </div>
        </div>
      </div>

      {/* Quick facts strip */}
      <div className={pageWidth}>
        <div className={cn("relative mx-2 -mt-18 grid grid-cols-2 sm:mx-12 md:grid-cols-4", glass)}>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="p-4 sm:px-5">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="mt-2 h-5 w-3/4" />
            </div>
          ))}
        </div>
      </div>

      <div className={cn("mt-8", pageWidth)}>
        <Skeleton className="h-13 w-full max-w-md rounded-full" />
      </div>

      <PlaceBody
        animate={false}
        main={
          <section className="space-y-3">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mb-4 h-10 w-40" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </section>
        }
        aside={
          <div className="space-y-3 rounded-[28px] border border-white/30 bg-white/14 p-6">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-7 w-4/5" />
            <Skeleton className="mt-4 h-12 w-full rounded-full" />
            <Skeleton className="h-12 w-full rounded-full" />
          </div>
        }
        reviews={
          <section className="space-y-3">
            <Skeleton className="mb-4 h-10 w-36" />
            <Skeleton className="h-32 w-full rounded-3xl" />
          </section>
        }
      />
    </main>
  );
}
