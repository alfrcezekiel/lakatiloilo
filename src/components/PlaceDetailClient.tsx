"use client";

import { Check, Copy, Share2 } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { pageWidth } from "@/components/place-width";

// The parts of the glass detail pages (glass detail pages round,
// 2026-11-22) that need the browser: sharing, copying
// and the section tabs that follow the scroll. The rest of the
// page stays a server component (src/components/PlaceDetail.tsx).

const roundGlass =
  "inline-flex size-11 cursor-pointer items-center justify-center rounded-full border border-white/30 bg-black/30 text-white glass transition-colors hover:bg-black/45 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";

// Share: the phone's share sheet where there is one, otherwise the address
// is copied and the button says "Link copied" for two seconds.
export function ShareButton({ title, className }: { title: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // The traveler closed the share sheet: nothing to do.
    }
  };
  return (
    <button
      type="button"
      onClick={share}
      aria-label={copied ? "Link copied" : `Share ${title}`}
      className={cn(roundGlass, className)}
    >
      {copied ? <Check aria-hidden="true" className="size-4.5" /> : <Share2 aria-hidden="true" className="size-4.5" />}
      <span role="status" className="sr-only">
        {copied ? "Link copied" : ""}
      </span>
    </button>
  );
}

// "Copy coordinates" beside the coordinates in the side panel.
export function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard refused (an old browser or a denied permission).
    }
  };
  return (
    <button
      type="button"
      onClick={copy}
      aria-label={copied ? "Copied" : label}
      className="inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-white/20 bg-white/10 text-white transition-colors hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
    >
      {copied ? <Check aria-hidden="true" className="size-4" /> : <Copy aria-hidden="true" className="size-4" />}
      <span role="status" className="sr-only">
        {copied ? "Copied" : ""}
      </span>
    </button>
  );
}

// The sticky tabs under the photo: links to the page's sections. The one
// whose section is on screen is marked (aria-current), so the traveler
// always sees where they are on a long page.
export function SectionTabs({ tabs }: { tabs: { id: string; label: string }[] }) {
  const [current, setCurrent] = useState(tabs[0]?.id);
  useEffect(() => {
    const sections = tabs
      .map((t) => document.getElementById(t.id))
      .filter((el): el is HTMLElement => el !== null);
    if (sections.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setCurrent(visible[0].target.id);
      },
      // The band just under the sticky nav and tabs.
      { rootMargin: "-150px 0px -55% 0px" },
    );
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, [tabs]);

  return (
    <div className={cn("sticky top-20 z-40 mt-8", pageWidth)}>
      <nav
        aria-label="On this page"
        className={cn(
          "glass flex max-w-full gap-1 overflow-x-auto rounded-full border border-white/20 p-1.5 sm:inline-flex",
          "bg-teal-950/50",
        )}
      >
        {tabs.map((t) => (
          <a
            key={t.id}
            href={`#${t.id}`}
            aria-current={current === t.id ? "true" : undefined}
            onClick={() => setCurrent(t.id)}
            className={cn(
              "shrink-0 whitespace-nowrap rounded-full px-4.5 py-2.5 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white",
              current === t.id
                ? "bg-white font-semibold text-teal-950"
                : "font-medium text-white/85 hover:text-white",
            )}
          >
            {t.label}
          </a>
        ))}
      </nav>
    </div>
  );
}
