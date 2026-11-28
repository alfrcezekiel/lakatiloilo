import type { Metadata } from "next";
import { AdminFaqsPage } from "@/components/admin/AdminFaqs";

export const metadata: Metadata = { title: "FAQs · Lakat Iloilo" };

// The team's FAQs screen (FAQs round, ticket 168). Only admins get past the
// proxy (src/proxy.ts) and the shell; the endpoint refuses everyone else too.
export default function AdminFaqsRoute() {
  return <AdminFaqsPage />;
}
