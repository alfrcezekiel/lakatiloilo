// The short summary search engines show under a page's title (the
// <meta name="description"> tag). Place pages had none, so results showed
// random text from the page (Lighthouse SEO 91, 2026-11-18).
//
// Built from the place's own description: spaces tidied, and cut at a
// whole word to fit about 155 characters, the length search results show.
// An empty description falls back to a plain sentence naming the place.
export const META_DESCRIPTION_MAX = 155;

export function metaDescription(text: string | null | undefined, placeName: string) {
  const clean = (text ?? "").replace(/\s+/g, " ").trim();
  if (!clean) return `${placeName} in Iloilo, with reviews from travelers on Lakat Iloilo.`;
  if (clean.length <= META_DESCRIPTION_MAX) return clean;
  const cut = clean.slice(0, META_DESCRIPTION_MAX - 1);
  const atWord = cut.slice(0, cut.lastIndexOf(" ") > 80 ? cut.lastIndexOf(" ") : cut.length);
  return `${atWord.replace(/[\s,.;:–-]+$/, "")}…`;
}
