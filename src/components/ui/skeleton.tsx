import * as React from "react";
import { cn } from "@/lib/utils";

// A grey placeholder shaped like content that is still loading. Give it a
// size with className (for example "h-6 w-48"). It pulses gently, except
// for visitors who turned on "reduce motion", who see it standing still.
// It is hidden from screen readers: the page around it says "Loading places".
export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={cn("rounded-md bg-white/20 motion-safe:animate-pulse", className)}
      {...props}
    />
  );
}
