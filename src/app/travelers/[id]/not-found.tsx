import type { Metadata } from "next";
import { TravelerNotFoundOrMine } from "@/components/TravelerProfileView";

export const metadata: Metadata = {
  title: "Traveler · Lakat Iloilo",
};

// Shown, with a real 404 status, when the backend has no public profile
// for this traveler (ticket 97): "We couldn't find this traveler", or the
// logged-in traveler's own empty profile if the id is theirs (that can only
// be known in the browser, so TravelerNotFoundOrMine reads the id from the
// address).
export default function TravelerNotFound() {
  return <TravelerNotFoundOrMine />;
}
