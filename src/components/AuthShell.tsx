import Link from "next/link";
import { Logo } from "@/components/Logo";
import { heroBackgroundUrl } from "@/components/HeroSection";

// The look of option 1a from the "Lakat Auth" design, shared by the log-in,
// Forgot password and Set new password pages, in two pieces:
//   AuthFrame - the page: mountain background, logo at the top, footer
//   AuthCard  - the frosted glass card in the middle, with its title
// AuthShell puts the two together for pages whose title never changes.

export function AuthFrame({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative flex min-h-screen flex-col bg-linear-to-br from-teal-800 via-emerald-700 to-green-600 text-white">
      <div aria-hidden="true" className="absolute inset-0">
        <img src={heroBackgroundUrl} alt="" className="h-full w-full object-cover opacity-40" />
        <div className="absolute inset-0 bg-linear-to-br from-teal-900/60 via-emerald-800/60 to-green-700/60" />
      </div>

      <div className="relative z-10 flex flex-1 flex-col">
        {/* Top bar: the logo, which also links home */}
        <header className="flex items-center justify-between px-4 py-6 sm:px-8">
          <Link href="/" className="hover:opacity-80 transition-opacity">
            <Logo width={163} height={34} />
          </Link>
        </header>

        <div className="flex flex-1 items-center justify-center px-4 py-6">{children}</div>

        <footer className="px-4 py-6 text-center text-xs text-white/70 sm:px-8 sm:text-left">
          © {new Date().getFullYear()} Lakat Iloilo. All rights reserved.
        </footer>
      </div>
    </main>
  );
}

export function AuthCard({
  title,
  children,
}: {
  title: React.ReactNode;
  children: React.ReactNode;
}) {
  // Dark glass (teal-950/40), not light glass: on the mountain photo the
  // old bg-white/15 made small white text too faint to read (evaluation B6,
  // 2026-11-05; WCAG 1.4.3 asks for 4.5:1).
  return (
    <div className="w-full max-w-md rounded-3xl border border-white/25 bg-teal-950/40 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
      <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-white/80">
        Iloilo City · Iloilo Province
      </p>
      <h1 className="font-fraunces mt-2 mb-6 text-4xl leading-tight font-medium tracking-tight">
        {title}
      </h1>
      {children}
    </div>
  );
}

export function AuthShell({
  title,
  children,
}: {
  title: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <AuthFrame>
      <AuthCard title={title}>{children}</AuthCard>
    </AuthFrame>
  );
}

// The white, rounded main button of the log-in, Forgot password and Set
// new password pages and their pop-ups. Works on <button>, <Button> and
// <Link>; each place adds its own spacing (for example "mt-3").
export const authButtonClass =
  "flex h-12 w-full items-center justify-center rounded-full bg-white text-base font-semibold text-teal-900 shadow-lg hover:bg-white/90 hover:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";
