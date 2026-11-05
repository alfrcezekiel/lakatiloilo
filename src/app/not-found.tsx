import type { Metadata } from "next";
import { cn } from "@/lib/utils";
import { BackLink, tones } from "@/components/PlaceDetail";

export const metadata: Metadata = {
  title: "Page not found · Lakat Iloilo",
};

// Shown for any address that is not a page of the site (for example /nope),
// with a real 404 status. It looks like the "couldn't find this traveler"
// page instead of Next.js's plain default (evaluation B4, 2026-11-04).
// Missing destinations and accommodations keep their own friendly page.
export default function NotFound() {
  return (
    <main className={cn("min-h-screen text-white", tones.destination.page)}>
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <h1 className="font-fraunces text-4xl font-medium">We couldn&apos;t find that page</h1>
        <p className="mt-2 text-white/80">
          The address may be old or mistyped. Head back home to keep exploring Iloilo.
        </p>
        <div className="mt-6">
          <BackLink />
        </div>
      </div>
    </main>
  );
}
