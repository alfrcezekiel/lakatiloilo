import type { Metadata } from "next";
import { cache } from "react";
import { getTraveler, type TravelerProfile } from "@/lib/api";
import { TravelerNotFoundOrMine, TravelerProfileView } from "@/components/TravelerProfileView";

// A traveler's public profile (profiles & likes round, ticket 73), opened
// from a reviewer's name. Fetched from the NestJS backend on the Next.js
// server, like the detail pages, so it arrives already filled in.
//
// cache(): the tab title (generateMetadata) and the page both need the
// traveler. Without it each asked the backend separately, so every visit
// made two identical requests; now they share one answer per visit.
const load = cache(async (id: string): Promise<TravelerProfile | null> => {
  try {
    return await getTraveler(id);
  } catch {
    // The backend could not be reached: show the same friendly page.
    return null;
  }
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const traveler = await load((await params).id);
  return { title: `${traveler ? traveler.display_name : "Traveler"} · Lakat Iloilo` };
}

export default async function TravelerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const traveler = await load(id);
  // No public profile: still the traveler's own profile if it is theirs.
  // (A 404 status through Next.js's notFound() was tried on 2026-11-01:
  // Next.js showed its default "could not be found" page instead of this
  // screen, so the page keeps answering 200 for now; see ticket 75.)
  if (!traveler) return <TravelerNotFoundOrMine />;
  return (
    <TravelerProfileView
      name={traveler.display_name}
      travelerType={traveler.traveler_type}
      reviews={traveler.reviews}
    />
  );
}
