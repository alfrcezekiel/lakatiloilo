// The Lakat Iloilo splash art (ticket 138): what travelers see in place of
// a place's photo until its credits are allowed. The team's art in public/,
// 1920 × 1080 (the FHD size, team decision 2026-11-11); since the code
// review of 2026-11-12 the WebP copy of that same art, about 250 KB instead
// of the PNG's 2.2 MB. Kept here once, so the cards, the place pages and a
// new category's card all use the same file.
export const SPLASH_ART = "/splash-desktop-1920x1080.webp";

// The same art at half size, 960 × 540, about 27 KB instead of 251 KB
// (2026-11-18). Phones and the small home cards don't need more: a
// phone's place-page hero is about 400 px wide. The browser picks one of
// the two by itself (srcSet in PlacePhoto). On a phone, Lighthouse
// measured the full-size art as the place page's slowest part (LCP 4.2 s
// on slow 4G).
export const SPLASH_ART_SMALL = "/splash-desktop-960x540.webp";
export const SPLASH_ART_SRCSET = `${SPLASH_ART_SMALL} 960w, ${SPLASH_ART} 1920w`;

// A 480 × 270 copy for small cards; the browser picks the 960 copy when a
// high-density screen needs more detail. This avoids sending the 960 asset
// to a card that only displays about 350 CSS pixels wide.
export const SPLASH_ART_CARD = "/splash-desktop-480x270.webp";
export const SPLASH_ART_CARD_SRCSET = `${SPLASH_ART_CARD} 480w, ${SPLASH_ART_SMALL} 960w`;
