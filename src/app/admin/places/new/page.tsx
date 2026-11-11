import type { Metadata } from "next";
import { AdminPlaceNew } from "@/components/admin/AdminPlaceNew";

export const metadata: Metadata = { title: "Add a place · Lakat Iloilo" };

// Adding a place (ticket 120). Only admins get past the proxy and the
// shell; the endpoint and the database refuse everyone else too.
export default function AdminPlaceNewPage() {
  return <AdminPlaceNew />;
}
