import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// What a destination or accommodation page looks like while it waits for
// the backend: the same photo, title card and About/Location layout as the
// real page, with grey blocks where the text will go. The background
// colour is passed in so each page keeps its own gradient.
export function DetailPageSkeleton({ background }: { background: string }) {
  return (
    <main aria-busy="true" className={cn("min-h-screen", background)}>
      {/* The only thing screen readers hear while the page loads. */}
      <p role="status" className="sr-only">
        Loading places
      </p>

      {/* Cover photo */}
      <div className="relative h-[60vh] w-full">
        <Skeleton className="h-full w-full rounded-none" />

        {/* A real link, so travelers can leave before the page finishes. */}
        <div className="absolute top-6 left-6">
          <Link
            href="/"
            className={cn(
              buttonVariants({ variant: "ghost" }),
              "bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/25 text-white",
            )}
          >
            ← Back to Home
          </Link>
        </div>

        {/* Title card */}
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <div className="mx-auto max-w-6xl">
            <div className="rounded-[var(--radius)] bg-white/15 backdrop-blur-xl border border-white/25 p-6 shadow-2xl">
              <div className="flex gap-2 mb-3">
                <Skeleton className="h-6 w-24 rounded-full" />
                <Skeleton className="h-6 w-28 rounded-full" />
              </div>
              <Skeleton className="h-9 w-2/3 max-w-md mb-3" />
              <Skeleton className="h-5 w-1/2 max-w-xs" />
            </div>
          </div>
        </div>
      </div>

      {/* About and Location */}
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 space-y-8">
        <section className="space-y-3">
          <Skeleton className="h-8 w-32 mb-4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-2/3" />
        </section>

        <section>
          <Skeleton className="h-8 w-36 mb-4" />
          <div className="rounded-[var(--radius)] bg-white/15 backdrop-blur-md border border-white/25 p-6 space-y-4">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-5 w-1/2" />
          </div>
        </section>
      </div>
    </main>
  );
}
