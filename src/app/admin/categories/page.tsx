import type { Metadata } from "next";
import { AdminCategoriesPage } from "@/components/admin/AdminCategories";

export const metadata: Metadata = { title: "Categories · Lakat Iloilo" };

// The team's Categories and kinds screen (ticket 116; its own page since
// 2026-11-11). Only admins get past the proxy (src/proxy.ts) and the
// shell; the endpoints refuse everyone else too.
export default function AdminCategoriesRoute() {
  return <AdminCategoriesPage />;
}
