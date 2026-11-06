"use client";

import { CircleUserRound, LogOut, UserRound } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import type { Traveler } from "@/lib/api";
import { displayNameOf } from "@/lib/login";

const item =
  "flex h-10 w-full items-center gap-2.5 rounded-lg px-3 text-left text-[0.9375rem] font-medium tracking-[0.01em] text-white/90 transition-colors hover:text-amber-300 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-white";

// The logged-in traveler's menu in the navbar on tablets and laptops
// (change 2026-11-01, team request): a round profile icon beside Explore.
// Clicking it opens a small glass dropdown with the traveler's name (in
// serif), "My profile" and "Log out". It closes after choosing, with Escape (which
// puts the keyboard back on the icon), or by clicking anywhere else.
// aria-expanded tells screen readers whether it is open. With "reduce
// motion" on, it just appears (MotionConfig in Providers).
export function ProfileMenu({ user, onLogOut }: { user: Traveler; onLogOut: () => void }) {
  const [open, setOpen] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const menuId = useId();
  const name = displayNameOf(user);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!wrapper.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        button.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={wrapper} className="relative">
      <button
        ref={button}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={`Account menu for ${name}`}
        className={`flex size-9 cursor-pointer items-center justify-center rounded-full border transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
          open
            ? "border-amber-300 bg-amber-400 text-amber-950"
            : "border-white/30 bg-white/10 text-white hover:bg-white/20"
        }`}
      >
        <CircleUserRound aria-hidden="true" className="size-5" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            id={menuId}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full z-50 mt-3 w-56 rounded-xl border border-white/20 bg-teal-900 p-1.5 shadow-2xl"
          >
            {/* The traveler's name in the site's serif (Fraunces), like
                the headings, so the menu reads as theirs at a glance. */}
            <div className="border-b border-white/15 px-3 pt-2.5 pb-3">
              <p className="truncate font-fraunces text-xl font-medium leading-tight tracking-tight text-white">
                {name}
              </p>
            </div>
            <div className="pt-1.5">
              <Link href={`/travelers/${user.id}`} onClick={() => setOpen(false)} className={item}>
                <UserRound aria-hidden="true" className="size-4 shrink-0" />
                My profile
              </Link>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onLogOut();
                }}
                className={`${item} cursor-pointer`}
              >
                <LogOut aria-hidden="true" className="size-4 shrink-0" />
                Log out
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
