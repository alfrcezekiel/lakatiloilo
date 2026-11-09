import type { Metadata } from "next";
import { AdminPlaceEdit } from "@/components/admin/AdminPlaceEdit";

export const metadata: Metadata = { title: "Edit place · Lakat Iloilo" };

// Editing one place (ticket 112). Only admins get past the proxy and the
// shell; the endpoints refuse everyone else too.
export default function AdminPlaceEditPage() {
  return <AdminPlaceEdit />;
}
