import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { pillButton } from "@/components/ui/button";

// The home page place cards are one big link each. This is how the link
// itself looks: it fills the card's grid cell and shows a white outline
// around the whole card when reached with the Tab key.
export const cardLink =
  "group block h-full rounded-(--radius) focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white";

// The amber "View details →" at the bottom of a home page card (buttons &
// cards round). It only LOOKS like a button: it is a <span> inside the
// card's link, because a link inside a link is not allowed and would make
// keyboard users stop twice per card. mt-auto pushes it to the bottom, so
// the buttons line up across a row even when descriptions differ.
// shadow-none: the main pill's amber glow showed as a haze on the
// see-through cards when hovering, so the card pill has no shadow.
export function ViewDetails({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        pillButton({ kind: "main" }),
        "mt-auto self-start shadow-none hover:shadow-none",
        className,
      )}
    >
      View details
      <ArrowRight
        aria-hidden="true"
        className="transition-transform motion-safe:group-hover:translate-x-1"
      />
    </span>
  );
}
