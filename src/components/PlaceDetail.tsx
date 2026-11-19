import { ArrowLeft, Camera, MapPin } from "lucide-react";
import type { ReactNode } from "react";
import Link from "next/link";
import type { PublicPhotoCredit, PublicPlacePhoto } from "@/lib/api";
import { PlacePhotoGallery } from "@/components/PlacePhotoGallery";
import { cn } from "@/lib/utils";
import { Reveal } from "@/components/Reveal";
import { pillButton } from "@/components/ui/button";
import { PlacePhoto } from "@/components/PlacePhoto";

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

export function BackLink({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn(pillButton({ kind: "glass" }), className)}>
      <ArrowLeft aria-hidden="true" />
      Back to Home
    </Link>
  );
}

// Back to Home on the detail pages and their loading skeletons (profiles &
// likes round, ticket 71). "fixed" pins it to the screen instead of the
// photo, so it stays in the top-left corner while the traveler scrolls and
// leaving a place never means scrolling back up. At the top of the page it
// sits exactly where it used to (top-5, left-4 / left-6). z-40 keeps it
// above the side panel (z-10) and below the scroll-to-top button (z-50).
// Its glass is darker than the other glass buttons (black instead of white
// tint), so it stays readable over white text and light photos.
export function FloatingBackLink() {
  return (
    <div className="fixed top-5 left-4 z-40 sm:left-6">
      <BackLink className="border-white/25 bg-black/35 hover:bg-black/50" />
    </div>
  );
}

// The photo across the top, with chips, the name and the address on it.
export function PlaceHero({
  tone,
  photoUrl,
  name,
  chips,
  address,
  photoCredit,
}: {
  tone: Tone;
  // null: the splash art (ticket 138).
  photoUrl: string | null;
  name: string;
  chips: string[];
  address: string;
  // Who took the photo (ticket 135); nothing shows without one.
  photoCredit?: PublicPhotoCredit | null;
}) {
  return (
    // The splash art (ticket 138) fills the same tall photo area a real
    // photo uses, kept to its top edge so the art's own title is not cut,
    // with the chips, name and address on it (team request 2026-11-11:
    // "restore it to the original similar to the credited photo"). A real
    // credited photo fills the frame (object-cover) at full resolution,
    // no thumbnail resizing (team request 2026-11-19).
    <header className="relative min-h-105 h-[62vh] w-full overflow-hidden">
      <PlacePhoto
        src={photoUrl}
        alt={name}
        size="hero"
        fullSize={true}
        // The art has its own title at the top; cropping it from the
        // centre like a photo cut that title in half on a laptop, so the
        // splash art is kept to its top edge (same frame and size).
        className={cn(
          "absolute inset-0 h-full w-full",
          photoUrl ? "object-cover" : "object-cover object-top",
        )}
      />
      <div
        className={cn("absolute inset-0 bg-linear-to-t to-transparent", tones[tone].fade)}
      />

      <FloatingBackLink />

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
          {photoCredit && <PhotoCreditLine credit={photoCredit} />}
        </div>
      </div>
    </header>
  );
}

// The photo's credit line at the foot of the photo (photo credits round,
// ticket 135): "Photo: Riyan0721 / Wikimedia Commons, CC BY-SA 4.0",
// linking to the original photo when the team saved its address. A
// pasted address in the line is one long word, so it may break anywhere
// (wrap-anywhere) instead of running off a phone's screen.
function PhotoCreditLine({ credit }: { credit: PublicPhotoCredit }) {
  return (
    <p
      className="mt-2 flex items-start gap-1.5 text-xs text-white/80 motion-safe:animate-fade-up"
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

// The name in big Fraunces letters, with the last word in italics. A word
// longer than a 320 px phone is wide ("Kabanwahanan") breaks instead of
// running off the screen (wrap-break-word, ticket 146 check).
// "Seda *Atria*". A one-word name stays upright.
function PlaceTitle({ name }: { name: string }) {
  const words = name.trim().split(/\s+/);
  const last = words.length > 1 ? words.pop() : null;
  return (
    <h1 className="font-fraunces text-[2.75rem] font-medium leading-[0.95] tracking-tight wrap-break-word text-white sm:text-6xl lg:text-7xl">
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
    <div className="min-w-0 rounded-xl border border-white/20 bg-white/10 p-3 sm:p-4">
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

// A place's other photos (admin extras round, ticket 146): the ones the
// team added after the cover whose credits are allowed, as small squares
// in a mosaic that opens a full-screen viewer with each photo's credit line
// (PlacePhotoGallery). Nothing shows when there are none.
export function PlacePhotosSection({ name, photos }: { name: string; photos: PublicPlacePhoto[] | undefined }) {
  if (!photos || photos.length === 0) return null;
  return (
    <Reveal>
      <section aria-labelledby="place-photos" aria-describedby="place-photos-hint">
        {/* The serif heading with a count pill, then a one-line hint (team
            request 2026-11-13: a design of its own, easy to read). */}
        <div className="mb-4 flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
          <h2 id="place-photos" className="font-fraunces text-3xl font-medium text-white">
            Photos
          </h2>
          <span className="rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-semibold tracking-wide text-white/90">
            {photos.length} {photos.length === 1 ? "photo" : "photos"}
          </span>
        </div>
        <p id="place-photos-hint" className="-mt-2 mb-4 text-sm leading-relaxed text-white/75">
          Tap a photo to see it larger. Each photo shows its photographer&apos;s credit.
        </p>
        <PlacePhotoGallery photos={photos} placeName={name} />
      </section>
    </Reveal>
  );
}

// The glass side panel: a small label, a serif title, then its contents.
// On a laptop it rises into the photo, so it keeps its blur: without it the
// photo shows sharply behind the white text (.claude/rules/frontend.md).
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
        {/* "some": the reviews can be far taller than the screen, so they
            stay visible while any part of them is on screen (see Reveal). */}
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

// Shown when the backend has no place with this id.
// "failed" means the backend could not be reached or answered with an
// error, rather than "no such place". Either way the traveler sees a
// friendly sentence, never the technical error text (evaluation B1,
// 2026-11-04: it used to show "Error: Request failed with status code 400").
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
