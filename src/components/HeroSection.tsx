import { ReactNode } from "react";

interface HeroSectionProps {
  children?: ReactNode;
}

export function HeroSection({ children }: HeroSectionProps) {
  return (
    <section className="relative min-h-screen bg-linear-to-br from-teal-800 via-emerald-700 to-green-600">
      {/* Background Image */}
      <div className="absolute inset-0">
        <img
          src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=80"
          alt="Iloilo sunset"
          className="h-full w-full object-cover opacity-40"
        />
        {/* Dark teal green gradient overlay */}
        <div className="absolute inset-0 bg-linear-to-br from-teal-900/60 via-emerald-800/60 to-green-700/60" />
      </div>

      {/* Hero Content */}
      <div className="relative z-10 mx-auto max-w-6xl px-4 pt-28 pb-12 sm:px-6 sm:pt-32 sm:pb-16">
        <p className="mb-4 text-xs font-semibold uppercase tracking-[0.25em] text-white/80 sm:text-sm">
          Iloilo City · Iloilo Province
        </p>
        <h1 className="font-fraunces mb-6 text-5xl leading-[0.95] font-medium tracking-tight text-white sm:text-6xl md:text-7xl lg:text-8xl">
          Lakat na, <em className="font-normal italic">Iloilo.</em>
        </h1>
        <p className="mb-10 max-w-2xl text-base leading-relaxed text-white/85 md:text-lg">
          Discover the beauty of Iloilo City and Province. From mountain
          peaks to cultural treasures, and from cozy hotels to modern
          condominiums, your adventure awaits.
        </p>
        {children}
      </div>
    </section>
  );
}
