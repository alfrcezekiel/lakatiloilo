import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// Each page keeps its own background gradient.
const backgrounds = {
  destination: "bg-linear-to-br from-teal-900 to-emerald-800",
  accommodation: "bg-linear-to-br from-blue-900 to-indigo-800",
};

const glassCard = "bg-white/15 backdrop-blur-md border border-white/25";

// What a destination or accommodation page looks like while it waits for
// the backend: the same photo, title card and body layout as the real page,
// with grey blocks where the text will go. Destinations have one narrow
// column (About, Location); accommodations have a wide two-part layout
// (About and Contact Information, plus a side panel), so each gets its own.
export function DetailPageSkeleton({
  kind,
}: {
  kind: "destination" | "accommodation";
}) {
  return (
    <main className={cn("min-h-screen", backgrounds[kind])}>
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

        {/* Title card: two pills (category, area) for destinations, one
            (hotel or condominium) for accommodations. */}
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <div className="mx-auto max-w-6xl">
            <Card className="bg-white/15 backdrop-blur-xl border border-white/25 p-6 shadow-2xl">
              <div className="flex gap-2 mb-3">
                <Skeleton className="h-6 w-24 rounded-full" />
                {kind === "destination" && (
                  <Skeleton className="h-6 w-28 rounded-full" />
                )}
              </div>
              <Skeleton className="h-9 w-2/3 max-w-md mb-3" />
              <Skeleton className="h-5 w-1/2 max-w-xs" />
            </Card>
          </div>
        </div>
      </div>

      {kind === "destination" ? <DestinationBody /> : <AccommodationBody />}
    </main>
  );
}

// A heading and a few lines of text, like the About section.
function AboutSkeleton() {
  return (
    <section className="space-y-3">
      <Skeleton className="h-8 w-32 mb-4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <Skeleton className="h-4 w-2/3" />
    </section>
  );
}

// A heading and a glass card of label/value pairs, like Location or
// Contact Information.
function DetailsCardSkeleton({ rows }: { rows: number }) {
  return (
    <section>
      <Skeleton className="h-8 w-44 mb-4" />
      <Card className={glassCard}>
        <CardContent className="p-6 space-y-4">
          {Array.from({ length: rows }, (_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-5 w-3/4" />
            </div>
          ))}
        </CardContent>
      </Card>
    </section>
  );
}

function DestinationBody() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 space-y-8">
      <AboutSkeleton />
      <DetailsCardSkeleton rows={2} />
    </div>
  );
}

function AccommodationBody() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-8">
          <AboutSkeleton />
          <DetailsCardSkeleton rows={3} />
        </div>

        {/* Side panel: Get in Touch buttons and Accommodation Type */}
        <div className="lg:col-span-1 space-y-6">
          <Card className={glassCard}>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
          <Card className={glassCard}>
            <CardHeader>
              <Skeleton className="h-6 w-44" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-5 w-24" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
