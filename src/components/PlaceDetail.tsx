import { ArrowLeft, Camera, ChevronRight, LayoutGrid, MapPin } from "lucide-react";
import type { ReactNode } from "react";
import Link from "next/link";
import type { PublicPhotoCredit, PublicPlacePhoto } from "@/lib/api";
import { PlacePhotoGallery } from "@/components/PlacePhotoGallery";
import { cn } from "@/lib/utils";
import { Reveal } from "@/components/Reveal";
import { pillButton } from "@/components/ui/button";
import { PlacePhoto } from "@/components/PlacePhoto";
import { CopyButton, ShareButton } from "@/components/PlaceDetailClient";
import { pageWidth } from "@/components/place-width";

// The building blocks of the destination and accommodation detail pages.
// Glass detail pages round (2026-11-22, design canvas "Lakat Iloilo —
// Destination & Accommodation Detail Pages"): a glass nav with a
// breadcrumb, the photo in a rounded frame, a glass strip of quick facts
// over the photo's foot, sticky section tabs, numbered section headings, a
// glass side panel with the one main action, and the map. Both pages share
// them so they always look like one family. Each page picks a "tone": blue
// for places to stay, teal for places to visit.

export type Tone = "accommodation" | "destination";

// The page background; the colour the photo fades into, so the photo melts
// into the page instead of ending in a hard line; the soft glow behind the
// body that gives the glass something to blur; and the dark glass tint of
// the nav and tabs.
export const tones: Record<Tone, { page: string; fade: string; glow: string; bar: string }> = {
  accommodation: {
    page: "bg-linear-to-br from-indigo-950 via-indigo-800 to-blue-700",
    fade: "from-indigo-950 via-indigo-950/40",
    glow: "bg-indigo-400/25",
    bar: "bg-indigo-950/55",
  },
  destination: {
    page: "bg-linear-to-br from-teal-950 via-teal-800 to-emerald-700",
    fade: "from-teal-950 via-teal-950/40",
    glow: "bg-teal-300/20",
    bar: "bg-teal-950/55",
  },
};

// "Glass": see-through white with a blur behind it.
export const glassPill =
  "inline-flex items-center rounded-full border border-white/25 bg-white/15 text-white backdrop-blur-md";

// The address that opens directions in Google Maps (Get directions).
export const directionsUrl = (latitude: number, longitude: number) =>
  `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;

export function BackLink({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn(pillButton({ kind: "glass" }), className)}>
      <ArrowLeft aria-hidden="true" />
      Back to Home
    </Link>
  );
}

// The top of a detail page (team request 2026-11-22): only "Back to Home"
// at the top-left corner and, on a laptop, where the traveler is
// (breadcrumb). No logo, no menu links, no bell or profile menu: the page
// is about the place. Sticky, so leaving never means scrolling back up.
export function PlaceNav({
  tone,
  crumbs,
}: {
  tone: Tone;
  // The last crumb (the place itself) has no href.
  crumbs: { label: string; href?: string }[];
}) {
  return (
    // pointer-events-none: the see-through part of the bar never blocks a
    // click on the page under it; only the back link and breadcrumb take one.
    <header className={cn("pointer-events-none sticky top-0 z-50 pt-4", pageWidth)}>
      <nav aria-label="Main" className="flex min-w-0 items-center gap-3 *:pointer-events-auto">
        <BackLink className={cn("shrink-0 border-white/25 hover:bg-black/45", tones[tone].bar)} />
        <ol
          aria-label="Breadcrumb"
          className={cn(
            "glass hidden h-11 min-w-0 items-center gap-1.5 rounded-full border border-white/20 px-4 text-[13px] text-white/80 lg:flex",
            tones[tone].bar,
          )}
        >
          {crumbs.map((crumb, index) => (
            <li key={`${crumb.label}-${index}`} className="flex min-w-0 items-center gap-1.5">
              {index > 0 && <span aria-hidden="true">/</span>}
              {crumb.href ? (
                <Link
                  href={crumb.href}
                  className="whitespace-nowrap hover:text-amber-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span aria-current="page" className="truncate font-semibold text-white">
                  {crumb.label}
                </span>
              )}
            </li>
          ))}
        </ol>
      </nav>
    </header>
  );
}

// The photo in a rounded frame, with chips, the name and the address on it,
// and Share / All photos in its top-right corner.
export function PlaceHero({
  tone,
  photoUrl,
  name,
  chips,
  address,
  photoCredit,
  photoCount = 0,
}: {
  tone: Tone;
  // null: the splash art (ticket 138).
  photoUrl: string | null;
  name: string;
  chips: string[];
  address: string;
  // Who took the photo (ticket 135); nothing shows without one.
  photoCredit?: PublicPhotoCredit | null;
  // The place's other photos (ticket 146): "All N photos" jumps to them.
  photoCount?: number;
}) {
  return (
    <div className={cn("relative mt-5", pageWidth)}>
      <header className="relative h-110 overflow-hidden rounded-[32px] border border-white/20 shadow-2xl sm:h-150">
        {/* The splash art (ticket 138) is kept to its top edge so the art's
            own title is not cut; a real photo fills the frame at full size
            (team request 2026-11-19). */}
        <PlacePhoto
          src={photoUrl}
          alt={name}
          size="hero"
          fullSize={true}
          className={cn("absolute inset-0 h-full w-full", photoUrl ? "object-cover" : "object-cover object-top")}
        />
        <div className={cn("absolute inset-0 bg-linear-to-t to-transparent", tones[tone].fade)} />

        <div className="absolute top-4 right-4 flex gap-2 sm:top-5 sm:right-5">
          <ShareButton title={name} />
          {photoCount > 0 && (
            <a
              href="#photos"
              className="glass inline-flex h-11 items-center gap-2 rounded-full border border-white/30 bg-black/30 px-4 text-sm font-semibold text-white transition-colors hover:bg-black/45 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <LayoutGrid aria-hidden="true" className="size-4" />
              All {photoCount} photos
            </a>
          )}
        </div>

        <div className="absolute inset-x-0 bottom-0 px-5 pb-24 sm:px-12 sm:pb-28">
          <div className="max-w-3xl">
            {/* Chips, then title, then address rise one after another. */}
            <div className="mb-4 flex flex-wrap gap-2 motion-safe:animate-fade-up">
              {chips.map((chip) => (
                <span key={chip} className={cn(glassPill, "glass px-3 py-1 text-xs font-semibold")}>
                  {chip}
                </span>
              ))}
            </div>
            <div className="motion-safe:animate-fade-up" style={{ animationDelay: "90ms" }}>
              <PlaceTitle name={name} />
            </div>
            <p
              className="mt-4 flex items-start gap-2 text-sm text-white/90 sm:text-[17px] motion-safe:animate-fade-up"
              style={{ animationDelay: "180ms" }}
            >
              <MapPin aria-hidden="true" className="mt-0.5 size-4.5 shrink-0" />
              {address}
            </p>
            {photoCredit && <PhotoCreditLine credit={photoCredit} />}
          </div>
        </div>
      </header>
    </div>
  );
}

// The photo's credit line (ticket 135): "Photo: Riyan0721 / Wikimedia
// Commons, CC BY-SA 4.0", linking to the original photo when the team saved
// its address. A pasted address may break anywhere (wrap-anywhere).
function PhotoCreditLine({ credit }: { credit: PublicPhotoCredit }) {
  return (
    <p
      className="mt-2.5 flex items-start gap-1.5 text-xs text-white/80 motion-safe:animate-fade-up"
      style={{ animationDelay: "240ms" }}
    >
      <Camera aria-hidden="true" className="mt-px size-3.5 shrink-0" />
      {credit.source_url ? (
        <a
          href={credit.source_url}
          target="_blank"
          rel="noopener noreferrer"
          className="min-w-0 wrap-anywhere underline decoration-white/40 underline-offset-2 hover:text-amber-300 hover:decoration-amber-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          {credit.credit_line}
          <span className="sr-only"> (opens the original photo in a new tab)</span>
        </a>
      ) : (
        <span className="min-w-0 wrap-anywhere">{credit.credit_line}</span>
      )}
    </p>
  );
}

// The name in big Fraunces letters, with the last word in italics:
// "Seda *Atria*". A one-word name stays upright. A word longer than a
// 320 px phone ("Kabanwahanan") breaks instead of running off the screen.
function PlaceTitle({ name }: { name: string }) {
  const words = name.trim().split(/\s+/);
  const last = words.length > 1 ? words.pop() : null;
  return (
    <h1 className="font-fraunces text-[2.75rem] font-medium leading-[0.95] tracking-tight wrap-break-word text-white sm:text-6xl lg:text-[5.75rem] lg:leading-[0.92] lg:tracking-[-0.03em]">
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

// The glass strip of quick facts that overlaps the photo's foot.
export function QuickFacts({ children }: { children: ReactNode }) {
  return (
    <div className={cn("relative", pageWidth)}>
      <div className="glass relative mx-2 -mt-18 grid grid-cols-2 overflow-hidden rounded-[22px] border border-white/25 bg-white/12 shadow-2xl sm:mx-12 md:grid-cols-4">
        {children}
      </div>
    </div>
  );
}

// One fact in the strip: "CATEGORY / Heritage Site".
export function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0 border-b border-white/15 p-4 text-white even:border-l sm:px-5 sm:py-4.5 md:border-b-0 md:border-l md:first:border-l-0">
      <p className="font-mono-label text-[11px] text-white/80">{label}</p>
      {/* hyphens-auto + wrap-break-word: one long word ("Condominium")
          breaks instead of spilling into the next fact on a 320 px phone. */}
      <div className="mt-1.5 wrap-break-word hyphens-auto text-[15px] font-semibold sm:text-[17px]">{children}</div>
    </div>
  );
}

// The old small glass tile ("TYPE / Hotel"). Kept for RatingTile and any
// page not yet moved to QuickFacts.
export function StatTile({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0 rounded-xl border border-white/20 bg-white/10 p-3 sm:p-4">
      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-white/60">{label}</p>
      <div className="mt-1 wrap-break-word hyphens-auto text-sm font-semibold text-white sm:text-base">{children}</div>
    </div>
  );
}

// A section heading in the same serif as the title, with an optional
// numbered label above it ("01 — About") in the accent colour.
export function SectionHeading({
  id,
  eyebrow,
  children,
}: {
  id?: string;
  eyebrow?: string;
  children: ReactNode;
}) {
  return (
    <div className="mb-5">
      {eyebrow && <p className="font-mono-label mb-2.5 text-xs text-accent">{eyebrow}</p>}
      <h2
        id={id}
        className="font-fraunces text-3xl font-medium leading-[1.05] tracking-[-0.02em] text-white sm:text-[2.75rem]"
      >
        {children}
      </h2>
    </div>
  );
}

// A place's other photos (ticket 146) as a mosaic that opens a full-screen
// viewer with each photo's credit line (PlacePhotoGallery). Nothing shows
// when there are none. id="photos": the hero's "All photos" and the
// section tabs jump here.
export function PlacePhotosSection({
  name,
  photos,
  eyebrow,
}: {
  name: string;
  photos: PublicPlacePhoto[] | undefined;
  eyebrow?: string;
}) {
  if (!photos || photos.length === 0) return null;
  return (
    <Reveal>
      <section id="photos" className="scroll-mt-36" aria-labelledby="place-photos" aria-describedby="place-photos-hint">
        <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
          <SectionHeading id="place-photos" eyebrow={eyebrow}>
            Photos
          </SectionHeading>
          <span className="mb-5 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-semibold tracking-wide text-white/90">
            {photos.length} {photos.length === 1 ? "photo" : "photos"}
          </span>
        </div>
        <p id="place-photos-hint" className="-mt-2 mb-4 text-sm leading-relaxed text-white/80">
          Tap a photo to see it larger. Each photo shows its photographer&apos;s credit.
        </p>
        <PlacePhotoGallery photos={photos} placeName={name} />
      </section>
    </Reveal>
  );
}

// An action in the side panel ("Get directions", "Call the front desk"):
// a real link styled as a pill (tel: opens the dialer, mailto: the email app).
export type PanelAction = { label: string; href: string; icon: ReactNode; external?: boolean };

function ActionLink({ action, kind }: { action: PanelAction; kind: "main" | "glass" }) {
  return (
    <a
      href={action.href}
      {...(action.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className={cn(pillButton({ kind }), "h-12 w-full")}
    >
      {action.icon}
      {action.label}
      {action.external && <span className="sr-only"> (opens in a new tab)</span>}
    </a>
  );
}

// The glass side panel: a small label (with a green "Live" dot: the page
// refreshes itself when the place changes, ticket 91), a serif title, the
// actions, then the facts. It keeps its blur, so whatever scrolls behind it
// never shows sharply behind the white text (.claude/rules/frontend.md).
export function SidePanel({
  eyebrow,
  title,
  primary,
  secondary,
  children,
}: {
  eyebrow: string;
  title: string;
  primary?: PanelAction;
  secondary?: PanelAction;
  children: ReactNode;
}) {
  const hasActions = Boolean(primary || secondary);
  return (
    <div className="glass-strong rounded-[28px] border border-white/30 bg-white/14 p-6 text-white shadow-2xl sm:p-6.5">
      <div className="flex items-center justify-between gap-3">
        <p className="font-mono-label text-[11px] text-white/80">{eyebrow}</p>
        <span className="inline-flex items-center gap-1.5 text-xs text-white/85">
          <span aria-hidden="true" className="size-2 rounded-full bg-green-400 shadow-[0_0_0_4px_rgb(74_222_128/0.2)]" />
          Live
        </span>
      </div>
      <p className="mt-1.5 font-fraunces text-[1.75rem] font-medium leading-tight">{title}</p>
      {hasActions && (
        <div className="mt-5 flex flex-col gap-2.5">
          {primary && <ActionLink action={primary} kind="main" />}
          {secondary && <ActionLink action={secondary} kind="glass" />}
        </div>
      )}
      <dl className={cn("space-y-4", hasActions ? "mt-6 border-t border-white/20 pt-5" : "mt-5")}>{children}</dl>
    </div>
  );
}

// "Address / M.H. del Pilar Street" inside the side panel; with `copy`, a
// Copy button sits beside it (coordinates).
export function PanelFact({
  label,
  copy,
  mono = false,
  children,
}: {
  label: string;
  copy?: string;
  mono?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-3">
      <div className="min-w-0">
        <dt className="text-xs text-white/80">{label}</dt>
        <dd
          className={cn(
            "mt-0.5 wrap-break-word text-[15px] font-medium text-white",
            mono && "[font-family:var(--font-plex-mono)] text-sm",
          )}
        >
          {children}
        </dd>
      </div>
      {copy && <CopyButton value={copy} label={`Copy ${label.toLowerCase()}`} />}
    </div>
  );
}

// "Keep exploring": links under the side panel, to more places like this
// one and to the other kind of place.
export function KeepExploring({
  tone,
  links,
}: {
  tone: Tone;
  links: { label: string; hint: string; href: string }[];
}) {
  return (
    <div
      className={cn(
        "glass rounded-3xl border border-white/20 p-5.5",
        tone === "destination" ? "bg-teal-950/35" : "bg-indigo-950/35",
      )}
    >
      <p className="font-mono-label mb-3 text-[11px] text-white/80">Keep exploring</p>
      <ul className="space-y-2">
        {links.map((l) => (
          <li key={l.href}>
            <Link
              href={l.href}
              className="flex items-center justify-between gap-3 rounded-2xl border border-white/20 bg-white/5 px-4 py-3.5 text-white transition duration-200 hover:border-white/45 motion-safe:hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <span className="min-w-0">
                <span className="block text-[15px] font-semibold">{l.label}</span>
                <span className="text-[13px] text-white/80">{l.hint}</span>
              </span>
              <ChevronRight aria-hidden="true" className="size-4.5 shrink-0" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

// The page body under the tabs. On a laptop the side panel sits on the
// right and sticks while the main column scrolls; on a phone it comes
// straight after the main sections, before the (long) reviews. The side
// panel and Reviews fade in as they scroll into view (see Reveal). The
// loading skeleton passes animate={false}, so it stays still.
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
    <div className={cn("relative pb-20 pt-8", pageWidth)}>
      {/* grid-cols-1 on phones: one long word in a review can't make the
          page scroll sideways. */}
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_400px] xl:gap-14">
        <div className="space-y-14 lg:col-start-1">{main}</div>
        <aside className="relative z-10 lg:col-start-2 lg:row-span-2 lg:row-start-1">
          {/* Reveal goes inside the sticky part, so the panel still sticks. */}
          <div className="lg:sticky lg:top-36">
            <Wrap>{aside}</Wrap>
          </div>
        </aside>
        {/* "some": the reviews can be far taller than the screen. */}
        {animate ? (
          <Reveal className="lg:col-start-1" amount="some">
            {reviews}
          </Reveal>
        ) : (
          <div className="lg:col-start-1">{reviews}</div>
        )}
      </div>
    </div>
  );
}

// The soft colour glows behind the body: glass only looks like glass when
// there is colour behind it to blur.
export function PageGlow({ tone }: { tone: Tone }) {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className={cn("absolute top-[900px] -left-40 size-130 rounded-full blur-[120px]", tones[tone].glow)} />
      <div className="absolute top-[1700px] -right-30 size-140 rounded-full bg-amber-400/12 blur-[140px]" />
    </div>
  );
}

// Shown when the backend has no place with this id. "failed": the backend
// could not be reached. Either way a friendly sentence, never the technical
// error (evaluation B1, 2026-11-04).
export function PlaceNotFound({ tone, what, failed = false }: { tone: Tone; what: string; failed?: boolean }) {
  return (
    <main className={cn("min-h-screen", tones[tone].page)}>
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h1 className="font-fraunces text-4xl font-medium text-white">
          {failed ? `We couldn't load this ${what.toLowerCase()}` : `${what} not found`}
        </h1>
        <p className="mt-2 text-sm text-white/80">
          {failed
            ? "Please check your connection and try again in a moment."
            : "This link may be old or mistyped. Try finding it from the home page."}
        </p>
        <div className="mt-6">
          <BackLink />
        </div>
      </div>
    </main>
  );
}
