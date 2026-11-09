import type { Metadata } from "next";
import { AdminPlaces } from "@/components/admin/AdminPlaces";

export const metadata: Metadata = { title: "Places · Lakat Iloilo" };

// The team's Places screen (ticket 112). Only admins get past the proxy
// (src/proxy.ts) and the shell; the endpoints refuse everyone else too.
export default function AdminPlacesPage() {
  return <AdminPlaces />;
}
