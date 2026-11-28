import { Heart } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { scrollToSection } from "@/lib/utils/scroll";

// `hasFaqs`: the home page shows a FAQs section (ticket 171), so the
// FAQs link has somewhere to go.
export function Footer({ hasFaqs = false }: { hasFaqs?: boolean }) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-white/20 bg-linear-to-br from-teal-900 to-emerald-800 py-12">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* Branding */}
          <div>
            <div className="mb-3">
              <Logo width={192} height={40} />
            </div>
            <p className="text-sm text-white/80">
              Your gateway to discovering the best of Iloilo City and Iloilo Province.
            </p>
          </div>

          {/* Navigation */}
          <div>
            {/* Links at least 24 px tall (evaluation 2026-11-12, WCAG 2.5.8). */}
            <h4 className="text-lg font-semibold text-white mb-4">Quick Links</h4>
            <ul className="space-y-2">
              <li>
                <button
                  type="button"
                  onClick={() => scrollToSection("explore")}
                  className="min-h-6 cursor-pointer text-sm text-white/80 hover:text-white transition-colors"
                >
                  Home
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => scrollToSection("about")}
                  className="min-h-6 cursor-pointer text-sm text-white/80 hover:text-white transition-colors"
                >
                  About Iloilo
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => scrollToSection("features")}
                  className="min-h-6 cursor-pointer text-sm text-white/80 hover:text-white transition-colors"
                >
                  Features
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => scrollToSection("explore-categories")}
                  className="min-h-6 cursor-pointer text-sm text-white/80 hover:text-white transition-colors"
                >
                  Explore
                </button>
              </li>
              {hasFaqs && (
                <li>
                  <button
                    type="button"
                    onClick={() => scrollToSection("faq")}
                    className="min-h-6 cursor-pointer text-sm text-white/80 hover:text-white transition-colors"
                  >
                    FAQs
                  </button>
                </li>
              )}
            </ul>
          </div>

          {/* Copyright */}
          <div>
            <h4 className="text-lg font-semibold text-white mb-4">Legal</h4>
            <p className="text-sm text-white/80">
              © {currentYear} Lakat Iloilo. All rights reserved.
            </p>
            {/* Our photo licences require crediting the photographers. */}
            <Link
              href="/credits"
              className="mt-2 inline-block min-h-6 py-0.5 text-sm text-white/80 underline underline-offset-2 transition-colors hover:text-white"
            >
              Photo credits
            </Link>
          </div>
        </div>

        <div className="border-t border-white/20 pt-8 text-center">
          <p className="text-xs text-white/60">
            Built with{" "}
            <Heart
              role="img"
              aria-label="love"
              className="inline-block size-3.5 fill-rose-400 text-rose-400 align-[-0.15em]"
            />{" "}
            for travelers exploring Iloilo
          </p>
        </div>
      </div>
    </footer>
  );
}
