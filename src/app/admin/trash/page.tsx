import type { Metadata } from "next";
import { AdminTrashPage } from "@/components/admin/AdminTrash";

export const metadata: Metadata = { title: "Trash · Lakat Iloilo" };

// The team's Trash (admin extras round, ticket 147). Only admins get past
// the proxy (src/proxy.ts) and the shell; the endpoints refuse everyone
// else too.
export default function AdminTrashRoute() {
  return <AdminTrashPage />;
}
