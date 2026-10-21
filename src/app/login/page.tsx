import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/components/LoginForm";
import { heroBackgroundUrl } from "@/components/HeroSection";

export const metadata: Metadata = {
  title: "Log in · Lakat Iloilo",
};

// Option 1a from the "Lakat Auth" design: the hero's mountain background,
// the logo at the top, a frosted glass card in the middle, and a small
// footer. The form reads ?next= from the address bar, which Next.js only
// allows inside a Suspense boundary on a page built ahead of time.
export default function LoginPage() {
  return (
    <main className="relative flex min-h-screen flex-col bg-linear-to-br from-teal-800 via-emerald-700 to-green-600 text-white">
      <div aria-hidden="true" className="absolute inset-0">
        <img
          src={heroBackgroundUrl}
          alt=""
          className="h-full w-full object-cover opacity-40"
        />
        <div className="absolute inset-0 bg-linear-to-br from-teal-900/60 via-emerald-800/60 to-green-700/60" />
      </div>

      <div className="relative z-10 flex flex-1 flex-col">
        <Suspense>
          <LoginForm />
        </Suspense>

        <footer className="px-4 py-6 text-center text-xs text-white/70 sm:px-8 sm:text-left">
          © 2026 Lakat Iloilo. All rights reserved.
        </footer>
      </div>
    </main>
  );
}
