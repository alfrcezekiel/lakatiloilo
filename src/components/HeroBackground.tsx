import { cn } from "@/lib/utils";

// The misty mountain photo (Unsplash) behind the home hero, the login pages
// and the admin dashboard, in sizes that fit the screen (2026-11-18).
//
// Before, every screen downloaded the same 1920 × 1280 JPEG (317 KB),
// including a 412 px wide phone. And because the photo fills a TALL box
// (object-cover), a plain smaller copy would have looked blurry on a phone:
// a wide photo has to be enlarged to fill the height. So:
// - Phones (up to 767 px wide) get a PORTRAIT crop of the same photo from
//   Unsplash (w × h, fit=crop): 720 × 1800 is about 72 KB.
// - Wider screens get the landscape photo at 1280 or 1920 px.
// - auto=format lets Unsplash send AVIF or WebP to browsers that support
//   them: the 1920 px photo is 178 KB instead of 317 KB.
// The browser picks one by itself (<picture>, srcSet, sizes).
const PHOTO = "https://images.unsplash.com/photo-1506905925346-21bda4d32df4";
const portrait = (w: number) => `${PHOTO}?w=${w}&h=${Math.round(w * 2.5)}&fit=crop&q=75&auto=format ${w}w`;
const landscape = (w: number) => `${PHOTO}?w=${w}&q=75&auto=format ${w}w`;

const PORTRAIT_SRCSET = [540, 720, 960].map(portrait).join(", ");
const LANDSCAPE_SRCSET = [1280, 1920].map(landscape).join(", ");
// For browsers that ignore srcSet: the full-size landscape photo.
export const heroBackgroundUrl = `${PHOTO}?w=1920&q=80&auto=format`;

export function HeroBackground({ alt = "", className }: { alt?: string; className?: string }) {
  return (
    // "contents": the <picture> wrapper adds no box of its own, so the
    // image keeps filling its parent exactly as the plain <img> did.
    <picture className="contents">
      <source media="(max-width: 767px)" srcSet={PORTRAIT_SRCSET} sizes="100vw" />
      <img
        src={heroBackgroundUrl}
        srcSet={LANDSCAPE_SRCSET}
        sizes="100vw"
        alt={alt}
        className={cn("h-full w-full object-cover", className)}
      />
    </picture>
  );
}
