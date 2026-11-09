import type { Metadata } from "next";
import { AdminReports } from "@/components/admin/AdminReports";

export const metadata: Metadata = { title: "Reports · Lakat Iloilo" };

// The team's Reports screen (ticket 108). Only admins get past the proxy
// (src/proxy.ts) and the shell; the endpoint refuses everyone else too.
export default function AdminReportsPage() {
  return <AdminReports />;
}
