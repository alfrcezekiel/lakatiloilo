import type { Metadata } from "next";
import { notFound } from "next/navigation";
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
//
// Answers the profile, null when the backend says there is no such
// traveler (404), or "failed" when the backend could not be reached.
const load = cache(async (id: string): Promise<TravelerProfile | null | "failed"> => {
  try {
    return await getTraveler(id);
  } catch {
    return "failed";
  }
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const traveler = await load((await params).id);
  return {
    title: `${traveler && traveler !== "failed" ? traveler.display_name : "Traveler"} · Lakat Iloilo`,
  };
}

export default async function TravelerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const traveler = await load(id);
  // No such traveler: a real 404 ("not found") status, with our own screen
  // from not-found.tsx next to this page (ticket 97).
  if (traveler === null) notFound();
  // The backend could not be reached: the same friendly screen, but not a
  // 404, because the traveler may well exist.
  if (traveler === "failed") return <TravelerNotFoundOrMine />;
  return (
    <TravelerProfileView
      travelerId={id}
      name={traveler.display_name}
      travelerType={traveler.traveler_type}
      reviews={traveler.reviews}
    />
  );
}
