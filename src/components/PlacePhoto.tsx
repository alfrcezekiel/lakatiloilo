// A place's photo on the traveler's site (ticket 138): the home page's
// destination and accommodation cards, the Featured and Trending cards,
// and the place page. The backend sends the photo only once the team has
// saved its credits with an allowed status (not "Not checked yet"); until
// then photo_url is null, and the Lakat Iloilo splash art shows in the
// same frame, filled and cropped the same way as a photo.
//
// The splash art is the team's own file in public/: the FHD art,
// 1920 × 1080 (team decision 2026-11-11, "option a": this one file
// everywhere, so it is loaded once). It is decoration (alt=""), because
// the place's name is always written next to it or on it.

export const SPLASH_FHD = "/lakat-iloilo-splash-desktop-fhd.png";

export function PlacePhoto({
  src,
  alt,
  className,
  splash = SPLASH_FHD,
}: {
  // The place's photo, or null while it may not be shown.
  src: string | null | undefined;
  // The place's name, for the real photo.
  alt: string;
  className?: string;
  splash?: string;
}) {
  return src ? (
    <img src={src} alt={alt} className={className} />
  ) : (
    <img src={splash} alt="" width={1920} height={1080} className={className} />
  );
}
