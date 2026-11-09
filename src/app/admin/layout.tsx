import type { Metadata } from "next";

// Every admin page (admin dashboard & moderation round, ticket 107): kept
// out of search engines and not linked from the traveler site. The title
// is the site's plain name, so a visitor who is shown "not found" here
// does not see a "dashboard" tab title; only the sign-in names the team.
export const metadata: Metadata = {
  title: "Lakat Iloilo",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
