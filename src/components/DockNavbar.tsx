"use client";

import { LogOut, UserRound, X } from "lucide-react";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { ProfileMenu } from "@/components/ProfileMenu";
import { scrollToSection } from "@/lib/utils/scroll";
import { displayNameOf, logOut as logOutOnThisDevice, useCurrentUser } from "@/lib/login";

export function DockNavbar() {
  const [isOpen, setIsOpen] = useState(false);
  const { user, ready } = useCurrentUser();

  // The Escape key closes the phone menu, like the close button.
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen]);

  const logOut = () => {
    setIsOpen(false);
    // Forgets the login here and asks the backend to end it on this
    // device. The navbar updates by itself: useCurrentUser hears about it.
    logOutOnThisDevice();
  };

  // "Log in", or the traveler's name with "Log out". Shown in the bar on
  // wider screens and in the slide-out menu on phones. Nothing shows for
  // the split second while the login is being checked.
  //
  // Logged in (change 2026-11-01, team request): on wider screens a
  // profile icon beside Explore opens a dropdown with "My profile" and
  // "Log out" (ProfileMenu). The phone menu has no room for a dropdown, so
  // it lists the name (in serif), "My profile" and "Log out" directly.
  const logInLink = (
    <Link
      href="/login"
      onClick={() => setIsOpen(false)}
      className="whitespace-nowrap font-semibold text-white hover:text-white/80"
    >
      Log in
    </Link>
  );
  const barAccount = !ready ? null : user ? (
    <ProfileMenu user={user} onLogOut={logOut} />
  ) : (
    logInLink
  );
  const phoneAccount = !ready ? null : user ? (
    <div className="flex flex-col gap-1">
      {/* The traveler's name in the site's serif, like the dropdown. */}
      <p className="truncate font-fraunces text-2xl font-medium leading-tight tracking-tight text-white">
        {displayNameOf(user)}
      </p>
      <Link
        href={`/travelers/${user.id}`}
        onClick={() => setIsOpen(false)}
        className="flex items-center gap-2 py-3 hover:text-white/80"
      >
        <UserRound aria-hidden="true" className="size-5" />
        My profile
      </Link>
      <button
        type="button"
        onClick={logOut}
        className="flex cursor-pointer items-center gap-2 py-3 text-left hover:text-white/80"
      >
        <LogOut aria-hidden="true" className="size-5" />
        Log out
      </button>
    </div>
  ) : (
    logInLink
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
      {/* The phone menu: the dark backdrop fades in and the panel slides
          in from the right, then both go out the same way when it closes.
          AnimatePresence keeps them on screen until the closing slide has
          finished. With "reduce motion" on, they just appear and go. */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              key="menu-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-md z-40 sm:hidden"
            />
            <motion.div
              key="menu-panel"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              className="fixed inset-0 z-50 sm:hidden"
            >
              <div className="h-full bg-teal-900/95 backdrop-blur-xl p-6 flex flex-col">
                <div className="flex items-center justify-between mb-8">
                  <Logo width={163} height={34} />
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    aria-label="Close menu"
                    className="text-white hover:text-white/80 transition-colors"
                  >
                    <X aria-hidden="true" className="size-7" />
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
                  {phoneAccount && <div className="py-3">{phoneAccount}</div>}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

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
            {barAccount && (
              <span className="hidden sm:flex items-center border-l border-white/25 pl-4">
                {barAccount}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            aria-label={isOpen ? "Close menu" : "Open menu"}
            aria-expanded={isOpen}
            className="sm:hidden flex flex-col gap-1.5 p-2 cursor-pointer group"
          >
            <span className={`block w-5 h-0.5 bg-white motion-safe:transition-all motion-safe:duration-300 ${isOpen ? 'rotate-45 translate-y-1.5' : ''}`}></span>
            <span className={`block w-5 h-0.5 bg-white motion-safe:transition-all motion-safe:duration-300 ${isOpen ? 'opacity-0' : ''}`}></span>
            <span className={`block w-5 h-0.5 bg-white motion-safe:transition-all motion-safe:duration-300 ${isOpen ? '-rotate-45 -translate-y-1.5' : ''}`}></span>
          </button>
        </div>
      </nav>
    </>
  );
}
