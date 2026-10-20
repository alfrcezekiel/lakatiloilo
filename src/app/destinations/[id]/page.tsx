import { getDestination } from "@/lib/api";
import type { Destination } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { locationLabels } from "@/lib/labels";

// Longer names for the detail page; the short names used elsewhere live in
// src/lib/labels.ts.
const categoryLabels: Record<string, string> = {
  mountain: "Mountains & Hiking",
  food: "Food & Dine-in",
  walking: "Walking Area",
  festival: "Festival",
  nature: "Nature & Parks",
  heritage: "Heritage Site",
};

export default async function DestinationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let destination: Destination | null = null;
  let error: Error | null = null;
  try {
    destination = await getDestination(id);
  } catch (e) {
    error = e instanceof Error ? e : new Error(String(e));
  }

  if (error || !destination) {
    return (
      <main className="min-h-screen bg-linear-to-br from-teal-900 to-emerald-800">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h1 className="text-2xl font-semibold text-white">
            Destination not found
          </h1>
          {error && (
            <p className="mt-2 text-sm text-white/70">Error: {error.message}</p>
          )}
          <Link href="/">
            <Button className="mt-4 bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/25 text-white">
              Back to Home
            </Button>
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-linear-to-br from-teal-900 to-emerald-800">
      {/* Full-width Cover Photo */}
      <div className="relative h-[60vh] w-full">
        <img
          src={destination.photo_url}
          alt={destination.name}
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-linear-to-t from-teal-900/80 to-transparent" />

        <div className="absolute top-6 left-6">
          <Link href="/">
            <Button
              variant="ghost"
              className="bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/25 text-white"
            >
              ← Back to Home
            </Button>
          </Link>
        </div>

        {/* Glass Title Card */}
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <div className="mx-auto max-w-6xl">
            <Card className="bg-white/15 backdrop-blur-xl border border-white/25 p-6 shadow-2xl">
              <div className="flex flex-wrap gap-2 mb-3">
                <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-medium text-white">
                  {categoryLabels[destination.category] ?? destination.category}
                </span>
                <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-medium text-white">
                  {locationLabels[destination.location_type] ??
                    destination.location_type}
                </span>
              </div>
              <h1 className="text-3xl font-bold text-white mb-2">
                {destination.name}
              </h1>
              <p className="text-white/90">📍 {destination.address}</p>
            </Card>
          </div>
        </div>
      </div>

      {/* Only real data from the database is shown here. Reviews, ratings
          and maps are out of scope for the MVP (see docs/SPEC.md). */}
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 space-y-8">
        <section>
          <h2 className="text-2xl font-semibold text-white mb-4">About</h2>
          <p className="text-white/90 leading-relaxed">
            {destination.description}
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-white mb-4">Location</h2>
          <Card className="bg-white/15 backdrop-blur-md border border-white/25">
            <CardContent className="p-6 space-y-4">
              <div>
                <p className="text-sm font-medium text-white/70">Address</p>
                <p className="text-white">{destination.address}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-white/70">Coordinates</p>
                <p className="text-white">
                  {destination.latitude}° N, {destination.longitude}° E
                </p>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}
