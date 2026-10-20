import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { photoCredits } from "@/lib/photo-credits";

export const metadata: Metadata = {
  title: "Photo credits · Lakat Iloilo",
};

// Lists every photographer whose photo the site uses, as their licences
// require. The list itself lives in src/lib/photo-credits.ts.
export default function CreditsPage() {
  return (
    <main className="min-h-screen bg-linear-to-br from-teal-900 to-emerald-800 text-white">
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
        <Link href="/">
          <Button className="mb-8 border border-white/25 bg-white/20 text-white backdrop-blur-md hover:bg-white/30">
            ← Back to Home
          </Button>
        </Link>

        <h1 className="font-fraunces mb-4 text-4xl font-medium sm:text-5xl">
          Photo credits
        </h1>
        <p className="mb-10 max-w-2xl text-white/85">
          The photos of places in Iloilo City and Iloilo Province were taken by
          the photographers below and shared on{" "}
          <a
            href="https://commons.wikimedia.org"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-white"
          >
            Wikimedia Commons
          </a>{" "}
          under Creative Commons licences. Thank you to all of them.
        </p>

        <ul className="space-y-3">
          {photoCredits.map((credit) => (
            <li
              key={credit.source}
              className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-md sm:p-5"
            >
              <p className="font-semibold">{credit.usedFor}</p>
              <p className="mt-1 text-sm text-white/80">
                <a
                  href={credit.source}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-2 hover:text-white"
                >
                  {credit.title}
                </a>{" "}
                by {credit.photographer}, licensed under{" "}
                <a
                  href={credit.licenceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-2 hover:text-white"
                >
                  {credit.licence}
                </a>
              </p>
            </li>
          ))}
        </ul>

        <p className="mt-10 text-sm text-white/70">
          Other photos on the site are from{" "}
          <a
            target="_blank"
            rel="noopener noreferrer"
            href="https://unsplash.com"
            className="underline underline-offset-2 hover:text-white"
          >
            Unsplash
          </a>
          , whose licence does not require credit.
        </p>
      </div>
    </main>
  );
}
