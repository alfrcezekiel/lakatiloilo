import { ArrowLeft, MapPin } from "lucide-react";
import type { ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Reveal } from "@/components/Reveal";
import { pillButton } from "@/components/ui/button";

// The building blocks of the destination and accommodation detail pages
// ("Option 1A" from the Detail Pages Glass design): a tall photo with a big
// serif title, a row of small glass tiles, and a glass side panel. Both
// pages share them so they always look like one family. Each page picks a
// "tone": blue for places to stay, teal for places to visit.

export type Tone = "accommodation" | "destination";

// The page background, and the colour the photo fades into so the photo
// melts into the page instead of ending in a hard line.
export const tones: Record<Tone, { page: string; fade: string }> = {
  accommodation: {
    page: "bg-linear-to-br from-indigo-950 via-indigo-800 to-blue-700",
    fade: "from-indigo-950 via-indigo-950/40",
  },
  destination: {
    page: "bg-linear-to-br from-teal-950 via-teal-800 to-emerald-700",
    fade: "from-teal-950 via-teal-950/40",
  },
};

// "Glass": see-through white with a blur behind it.
export const glassPill =
  "inline-flex items-center rounded-full border border-white/25 bg-white/15 text-white backdrop-blur-md";

export function BackLink() {
  return (
    <Link href="/" className={pillButton({ kind: "glass" })}>
      <ArrowLeft aria-hidden="true" />
      Back to Home
    </Link>
  );
}

// The photo across the top, with chips, the name and the address on it.
export function PlaceHero({
  tone,
  photoUrl,
  name,
  chips,
  address,
}: {
  tone: Tone;
  photoUrl: string;
  name: string;
  chips: string[];
  address: string;
}) {
  return (
    <header className="relative min-h-105 h-[62vh] w-full overflow-hidden">
      <img
        src={photoUrl}
        alt={name}
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div
        className={cn("absolute inset-0 bg-linear-to-t to-transparent", tones[tone].fade)}
      />

      <div className="absolute top-5 left-4 sm:left-6">
        <BackLink />
      </div>

      <div className="absolute inset-x-0 bottom-0">
        {/* On a laptop the text stays out of the right-hand column, where
            the side panel rises into the photo. */}
        <div className="mx-auto max-w-6xl px-4 pb-8 sm:px-6 lg:pb-10 lg:pr-100">
          {/* Chips, then title, then address rise one after another. */}
          <div className="flex flex-wrap gap-2 mb-3 motion-safe:animate-fade-up">
            {chips.map((chip) => (
              <span
                key={chip}
                className={cn(glassPill, "px-3 py-0.5 text-xs font-semibold")}
              >
                {chip}
              </span>
            ))}
          </div>
          <div className="motion-safe:animate-fade-up" style={{ animationDelay: "90ms" }}>
            <PlaceTitle name={name} />
          </div>
          <p
            className="mt-3 flex items-start gap-1.5 text-sm text-white/85 sm:text-base motion-safe:animate-fade-up"
            style={{ animationDelay: "180ms" }}
          >
            <MapPin aria-hidden="true" className="mt-0.5 size-4 shrink-0 sm:mt-1" />
            {address}
          </p>
        </div>
      </div>
    </header>
  );
}

// The name in big Fraunces letters, with the last word in italics:
// "Seda *Atria*". A one-word name stays upright.
function PlaceTitle({ name }: { name: string }) {
  const words = name.trim().split(/\s+/);
  const last = words.length > 1 ? words.pop() : null;
  return (
    <h1 className="font-fraunces text-[2.75rem] font-medium leading-[0.95] tracking-tight text-white sm:text-6xl lg:text-7xl">
      {words.join(" ")}
      {last && (
        <>
          {" "}
          <em className="font-normal italic">{last}</em>
        </>
      )}
    </h1>
  );
}

// One small glass tile in the row under the photo: "TYPE / Hotel".
export function StatTile({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0 rounded-xl border border-white/20 bg-white/10 p-3 backdrop-blur-md sm:p-4">
      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-white/60">
        {label}
      </p>
      {/* On a 320 px phone a tile has about 65 px for its value, but a
          single word like "Condominium" needs 90 px, and a browser never
          breaks a word by itself, so it spilled into the next tile.
          hyphens-auto breaks it at an English hyphenation point
          ("Condo-minium", using lang="en" on the page); wrap-break-word
          breaks it anyway if no such point fits. Short values are not
          affected. */}
      <div className="mt-1 wrap-break-word hyphens-auto text-sm font-semibold text-white sm:text-base">
        {children}
      </div>
    </div>
  );
}

// A section heading in the same serif as the title.
export function SectionHeading({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <h2 id={id} className="font-fraunces text-3xl font-medium text-white mb-4">
      {children}
    </h2>
  );
}

// The glass side panel: a small label, a serif title, then its contents.
export function SidePanel({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/30 bg-white/15 p-6 text-white shadow-2xl backdrop-blur-xl">
      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-white/65">
        {eyebrow}
      </p>
      <p className="mt-1 font-fraunces text-2xl font-medium leading-tight">{title}</p>
      <div className="mt-5 space-y-4">{children}</div>
    </div>
  );
}

// "Address / M.H. del Pilar Street" inside the side panel.
export function PanelFact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-xs text-white/60">{label}</p>
      <p className="text-sm font-medium text-white wrap-break-word">{children}</p>
    </div>
  );
}

// The page body under the photo. On a laptop the side panel sits on the
// right and rises a little into the photo; on a phone it comes straight
// after the tiles and About, before the (long) reviews. The side panel and
// Reviews fade in as they scroll into view (see Reveal). The loading
// skeleton passes animate={false}, so it stays still and only the real page
// rises in, once.
export function PlaceBody({
  main,
  aside,
  reviews,
  animate = true,
}: {
  main: ReactNode;
  aside: ReactNode;
  reviews: ReactNode;
  animate?: boolean;
}) {
  const Wrap = animate ? Reveal : "div";
  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-6 sm:px-6 lg:pt-8">
      {/* grid-cols-1 on phones: the one column is exactly the screen's
          width. Without it, the column grew to fit its widest content, so
          one long word in a review made the whole page scroll sideways. */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-10">
        <div className="space-y-8 lg:col-start-1">{main}</div>
        <aside className="relative z-10 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:-mt-36">
          {/* Reveal goes inside the sticky part, so the panel still
              sticks while scrolling on a laptop. */}
          <div className="lg:sticky lg:top-6">
            <Wrap>{aside}</Wrap>
          </div>
        </aside>
        <Wrap className="lg:col-start-1">{reviews}</Wrap>
      </div>
    </div>
  );
}

// Shown when the backend has no place with this id.
export function PlaceNotFound({ tone, what, message }: { tone: Tone; what: string; message?: string }) {
  return (
    <main className={cn("min-h-screen", tones[tone].page)}>
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h1 className="font-fraunces text-4xl font-medium text-white">{what} not found</h1>
        {message && <p className="mt-2 text-sm text-white/70">Error: {message}</p>}
        <div className="mt-6">
          <BackLink />
        </div>
      </div>
    </main>
  );
}
