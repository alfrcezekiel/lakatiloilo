"use client";

import { useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { scrollToSection } from "@/lib/utils/scroll";
import { createClient } from "@/lib/supabase/client";
import { displayNameOf, useCurrentUser } from "@/lib/auth";

export function DockNavbar() {
  const [isOpen, setIsOpen] = useState(false);
  const { user, ready } = useCurrentUser();

  const logOut = async () => {
    setIsOpen(false);
    // The navbar updates by itself: useCurrentUser hears about the logout.
    await createClient().auth.signOut();
  };

  // "Log in", or the traveler's name with "Log out". Shown in the bar on
  // wider screens and in the slide-out menu on phones. Nothing shows for
  // the split second while the login is being checked.
  const accountItem = !ready ? null : user ? (
    <span className="flex items-center gap-2 whitespace-nowrap">
      <span className="max-w-32 truncate text-white/80">
        Hi, {displayNameOf(user)}
      </span>
      <button
        type="button"
        onClick={logOut}
        className="cursor-pointer font-semibold text-white hover:text-white/80"
      >
        Log out
      </button>
    </span>
  ) : (
    <Link
      href="/login"
      onClick={() => setIsOpen(false)}
      className="whitespace-nowrap font-semibold text-white hover:text-white/80"
    >
      Log in
    </Link>
  );

  const handleScrollToSection = (sectionId: string) => {
    setIsOpen(false);
    scrollToSection(sectionId);
  };

  const navLinks = [
    { id: "explore", label: "Home" },
    { id: "about", label: "About" },
    { id: "features", label: "Features" },
    { id: "explore-categories", label: "Explore" },
  ];

  return (
    <>
      {isOpen && (
        <>
          <div
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black/50 backdrop-blur-md z-40 sm:hidden"
          />
          <div className="fixed inset-0 z-50 sm:hidden">
            <div className="h-full bg-teal-900/95 backdrop-blur-xl p-6 flex flex-col">
              <div className="flex items-center justify-between mb-8">
                <Logo width={163} height={34} />
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-white hover:text-white/80 transition-colors text-2xl"
                >
                  ✕
                </button>
              </div>
              <div className="flex flex-col gap-4 text-lg font-medium text-white">
                {navLinks.map((link) => (
                  <span
                    key={link.id}
                    onClick={() => handleScrollToSection(link.id)}
                    className="cursor-pointer hover:text-white/80 py-3 transition-colors duration-200 border-b border-white/10 last:border-0"
                  >
                    {link.label}
                  </span>
                ))}
                {accountItem && <div className="py-3">{accountItem}</div>}
              </div>
            </div>
          </div>
        </>
      )}

      {/* sm:w-max: on tablets and laptops the bar is as wide as its
          contents. Without it, "left-1/2" lets the bar use only half the
          screen, which squeezed the logo (to about 30px on a tablet). */}
      <nav className={`fixed top-4 left-1/2 z-50 -translate-x-1/2 rounded-2xl px-4 py-2 sm:px-8 sm:py-3 shadow-2xl bg-teal-900/95 backdrop-blur-xl border border-white/25 w-[calc(100%-2rem)] sm:w-max sm:max-w-[calc(100%-2rem)] sm:min-w-96 md:min-w-md ${isOpen ? 'hidden sm:flex' : 'flex'}`}>
        <div className="flex items-center justify-between w-full">
          {/* shrink-0: the logo keeps its full size (163 x 34) on every screen. */}
          <Link href="/" className="shrink-0 hover:opacity-80 transition-opacity mr-8 sm:mr-12">
            <Logo width={163} height={34} />
          </Link>
          <div className="flex items-center gap-2 sm:gap-4 text-xs font-medium text-white/90 sm:text-sm">
            {navLinks.map((link) => (
              <span
                key={link.id}
                onClick={() => scrollToSection(link.id)}
                className="cursor-pointer hover:text-white hidden sm:inline transition-colors duration-200"
              >
                {link.label}
              </span>
            ))}
            {accountItem && (
              <span className="hidden sm:flex items-center border-l border-white/25 pl-4">
                {accountItem}
              </span>
            )}
          </div>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="sm:hidden flex flex-col gap-1.5 p-2 cursor-pointer group"
          >
            <span className={`block w-5 h-0.5 bg-white transition-all duration-300 ${isOpen ? 'rotate-45 translate-y-1.5' : ''}`}></span>
            <span className={`block w-5 h-0.5 bg-white transition-all duration-300 ${isOpen ? 'opacity-0' : ''}`}></span>
            <span className={`block w-5 h-0.5 bg-white transition-all duration-300 ${isOpen ? '-rotate-45 -translate-y-1.5' : ''}`}></span>
          </button>
        </div>
      </nav>
    </>
  );
}
