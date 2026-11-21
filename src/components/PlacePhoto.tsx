// A place's photo on the traveler's site (ticket 138): the home page's
// destination and accommodation cards, the Featured and Trending cards,
// and the place page. The backend sends the photo only once the team has
// saved its credits with an allowed status (not "Not checked yet"); until
// then photo_url is null, and the Lakat Iloilo splash art shows in the
// same frame instead. A real photo is never cropped or zoomed: wherever
// it shows, it keeps its own aspect ratio (object-contain; team request
// 2026-11-19).
//
// By default, photos are resized for performance (photoThumb/photoSrcSet
// request smaller copies). The `fullSize` prop skips that and uses the
// original uploaded URL at its full resolution (team request 2026-11-19).
//
// The splash art is the team's own art, 1920 × 1080 (SPLASH_ART in
// src/lib/splash.ts: one file everywhere, so it is loaded once). It is
// decoration (alt=""), because the place's name is always written next to
// it or on it.

import {
  SPLASH_ART,
  SPLASH_ART_CARD,
  SPLASH_ART_CARD_SRCSET,
  SPLASH_ART_SRCSET,
} from "@/lib/splash";
import { photoSrcSet, photoThumb } from "@/lib/photo-url";

// Where each size shows on screen, in CSS pixels — the "sizes" hint the
// browser uses to pick from the srcset:
//   thumb — the small square in the Featured/Trending cards.
//   card  — the photo on the home page's grid cards (one column on a
//           phone, two from 640 px, three from 1024 px).
//   hero  — the photo across the top of a place page (the screen's width).
const SIZES = {
  thumb: "(min-width: 640px) 192px, (min-width: 400px) 128px, 96px",
  card: "(min-width: 1024px) 352px, (min-width: 640px) calc((100vw - 72px) / 2), calc(100vw - 32px)",
  hero: "100vw",
} as const;

type PhotoSize = keyof typeof SIZES;

// The fallback src (for browsers without srcset) and the srcset
// candidates, in pixels asked of the photo host.
const FALLBACK = { thumb: 384, card: 768, hero: 1280 } as const;
const CANDIDATES = {
  thumb: [320, 512],
  card: [512, 800],
  hero: [640, 960, 1280],
} as const;

export function PlacePhoto({
  src,
  alt,
  className,
  splash = SPLASH_ART,
  size = "card",
  fullSize = false,
}: {
  // The place's photo, or null while it may not be shown.
  src: string | null | undefined;
  // The place's name, for the real photo.
  alt: string;
  className?: string;
  splash?: string;
  size?: PhotoSize;
  // When true, use the original URL at full resolution instead of
  // requesting a smaller copy (team request 2026-11-19).
  fullSize?: boolean;
}) {
  // The hero is the largest picture on a place page (its LCP), so the
  // browser downloads it before anything else (Lighthouse "LCP request
  // discovery", 2026-11-21). Cards get no hint, so they never compete.
  const heroPriority = size === "hero" ? "high" : undefined;

  if (!src) {
    // Cards use a 480 px copy and a 960 px option for high-density screens.
    // The hero keeps its 960/1920 options (see src/lib/splash.ts).
    // A different splash passed in is used as it is.
    const cardSplash = size !== "hero" && splash === SPLASH_ART;
    return (
      <img
        src={cardSplash ? SPLASH_ART_CARD : splash}
        srcSet={
          cardSplash
            ? SPLASH_ART_CARD_SRCSET
            : splash === SPLASH_ART
              ? SPLASH_ART_SRCSET
              : undefined
        }
        sizes={cardSplash ? SIZES[size] : splash === SPLASH_ART ? SIZES.hero : undefined}
        alt=""
        width={1920}
        height={1080}
        loading={size === "hero" ? "eager" : "lazy"}
        fetchPriority={heroPriority}
        className={className}
      />
    );
  }

  if (fullSize) {
    // Original URL at full resolution — no resizing.
    return (
      <img
        src={src}
        alt={alt}
        loading={size === "hero" ? "eager" : "lazy"}
        fetchPriority={heroPriority}
        className={className}
      />
    );
  }

  // Resized copy for performance (photoThumb/photoSrcSet).
  return (
    <img
      src={photoThumb(src, FALLBACK[size])}
      srcSet={photoSrcSet(src, [...CANDIDATES[size]])}
      sizes={SIZES[size]}
      alt={alt}
      loading={size === "hero" ? "eager" : "lazy"}
      fetchPriority={heroPriority}
      className={className}
    />
  );
}
