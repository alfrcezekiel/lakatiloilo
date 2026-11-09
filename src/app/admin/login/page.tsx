import type { Metadata } from "next";
import { AdminSignIn } from "@/components/admin/AdminSignIn";

export const metadata: Metadata = {
  title: "Team sign-in · Lakat Iloilo",
};

// The Lakat Iloilo team's own sign-in (ticket 107).
export default function AdminLoginPage() {
  return <AdminSignIn />;
}
