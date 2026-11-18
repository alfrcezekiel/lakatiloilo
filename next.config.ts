import type { NextConfig } from "next";

// Security headers for every page (evaluation B5, 2026-11-04). The simple,
// safe ones only: nosniff (the browser never guesses a file's type),
// Referrer-Policy (other sites see only our domain, not the full address),
// and X-Frame-Options (no other site can show ours inside a frame). A
// Content-Security-Policy is parked in docs/LATER.md: it could block
// Supabase live updates, review photos or Next.js's own scripts.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
];

const nextConfig: NextConfig = {
  // Don't announce "X-Powered-By: Next.js" to every visitor.
  poweredByHeader: false,
  // Page titles and descriptions go in the <head> for every visitor
  // (team decision, 2026-11-18). By default Next.js 16 sends the page first
  // and streams this metadata in after the <head>, except for a list of
  // bots. Search engines that run JavaScript still read it, but checkers
  // such as Lighthouse's SEO audit, and link previews in apps not on that
  // list, only look in the <head>: Lighthouse reported "no meta
  // description" on place pages although they had one (SEO 91). The cost:
  // a page waits for its metadata before sending anything. Place pages load
  // their metadata from the same cached backend answer the page itself
  // needs, so that is no extra request.
  htmlLimitedBots: /.*/,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  // Cache Components and Partial Prefetching are deliberately OFF.
  //
  // With them on, any page that reads from the database (or uses
  // cookies, headers or searchParams) fails the build unless it is
  // wrapped in <Suspense> or marked with "use cache". That is a fine
  // trade for a production team tuning performance; for a team writing
  // its first database query it is an opaque build error at exactly
  // the wrong moment.
  //
  // Turn them back on later if you want them, and read:
  // https://nextjs.org/docs/messages/blocking-prerender-dynamic
  experimental: {
    // Lets `next upgrade` focus on security fixes for this project.
    agentUpgrade: "security",
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
