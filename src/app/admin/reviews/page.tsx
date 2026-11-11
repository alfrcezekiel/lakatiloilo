import type { Metadata } from "next";
import { AdminReviews } from "@/components/admin/AdminReviews";

export const metadata: Metadata = { title: "Reviews · Lakat Iloilo" };

// The team's Reviews screen (ticket 122). Only admins get past the proxy
// (src/proxy.ts) and the shell; the endpoint refuses everyone else too.
export default function AdminReviewsPage() {
  return <AdminReviews />;
}
