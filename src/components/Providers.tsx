"use client";

import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MotionConfig, useReducedMotion } from "motion/react";

// Wraps the whole site (see src/app/layout.tsx).
//
// TanStack Query's "cache": the browser's short-lived copy of data it has
// fetched, kept while the traveler moves between pages. Today only reviews
// use it; places are fetched on the Next.js server and the login keeps its
// own code (see docs/SPEC.md, polish round).
//
// Motion's settings: every animation follows the device's "reduce motion"
// setting. When it is on, animations finish instantly, so nothing slides
// or fades.
export function Providers({ children }: { children: ReactNode }) {
  // One cache per browser tab, made once. (Made inside the component, not
  // at the top of the file, so two visitors never share one on the server.)
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Keep a copy for about a minute after the traveler leaves a
            // page. Coming back within that minute shows it straight away,
            // while a fresh copy loads quietly in the background.
            gcTime: 60_000,
            staleTime: 0,
            // Try once more before showing "couldn't load", instead of the
            // default three tries, so travelers don't wait long for it.
            retry: 1,
          },
        },
      }),
  );
  const reduceMotion = useReducedMotion();

  return (
    <QueryClientProvider client={queryClient}>
      <MotionConfig
        reducedMotion="user"
        transition={
          reduceMotion ? { duration: 0 } : { duration: 0.35, ease: [0.22, 1, 0.36, 1] }
        }
      >
        {children}
      </MotionConfig>
    </QueryClientProvider>
  );
}
