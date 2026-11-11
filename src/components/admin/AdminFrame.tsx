import { heroBackgroundUrl } from "@/components/HeroSection";

// The background every admin page sits on (admin dashboard & moderation
// round, ticket 107): the site's Iloilo mountain photo, darkened with a
// deep teal layer so white text on the glass panels stays readable (WCAG
// AA).
export function AdminFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen bg-teal-950 text-white">
      <div aria-hidden="true" className="fixed inset-0">
        <img src={heroBackgroundUrl} alt="" className="h-full w-full object-cover opacity-45" />
        <div className="absolute inset-0 bg-linear-to-br from-teal-950/90 via-teal-900/80 to-emerald-950/85" />
      </div>
      <div className="relative z-10 min-h-screen">{children}</div>
    </div>
  );
}

// The glass panel used across the dashboard: dark see-through glass with a
// clear border, never a white box. No backdrop-blur and no big shadow
// (team report 2026-11-11: black patches appeared on the cards on hover
// and click). Chrome redraws a blur in tiles whenever something inside or
// over it changes, and on the dark dashboard the seams showed as black
// patches; see "No black backdrop on the dashboard" in
// .claude/rules/frontend.md. A slightly firmer fill keeps the text as
// readable as the blur did.
export const adminGlass = "rounded-2xl border border-white/20 bg-teal-950/60";
