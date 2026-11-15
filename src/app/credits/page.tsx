import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getPhotoCredits, type PhotoCreditEntry } from "@/lib/api";
import { licenceLabels } from "@/lib/labels";
import { photoCredits } from "@/lib/photo-credits";

// Asked again on every visit, so a credit saved on the dashboard shows
// after a reload (ticket 136).
export const dynamic = "force-dynamic";

// The credits the team saved on the dashboard; the page still shows the
// Wikimedia list if they cannot be read.
async function loadSaved(): Promise<{ saved: PhotoCreditEntry[]; failed: boolean }> {
  try {
    return { saved: await getPhotoCredits(), failed: false };
  } catch {
    return { saved: [], failed: true };
  }
}

export const metadata: Metadata = {
  title: "Photo credits · Lakat Iloilo",
};

// Lists every photographer whose photo the site uses, as their licences
// require. The list itself lives in src/lib/photo-credits.ts.
export default async function CreditsPage() {
  const { saved, failed } = await loadSaved();
  return (
    <main className="min-h-screen bg-linear-to-br from-teal-900 to-emerald-800 text-white">
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
        {/* One link styled as the button it used to wrap (a button inside
            a link was two Tab stops; evaluation 2026-11-12). */}
        <Link
          href="/"
          className="mb-8 inline-flex h-10 items-center gap-2 rounded-(--radius) border border-white/25 bg-white/20 px-4 text-sm font-medium text-white transition-colors hover:bg-white/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Back to Home
        </Link>

        <h1 className="font-fraunces mb-4 text-4xl font-medium sm:text-5xl">
          Photo credits
        </h1>
        <p className="mb-10 max-w-2xl text-white/85">
          The photos of places in Iloilo City and Iloilo Province were taken by
          the photographers below. Many were shared on{" "}
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

        {/* Ticket 136: the photos the team added on the dashboard. */}
        {saved.length > 0 && (
          <section aria-labelledby="team-credits" className="mb-12">
            <h2 id="team-credits" className="font-fraunces mb-4 text-2xl font-medium">
              Place photos
            </h2>
            <ul className="space-y-3">
              {saved.map((credit) => (
                <li
                  key={credit.photo_id}
                  className="rounded-2xl border border-white/20 bg-white/10 p-4 sm:p-5"
                >
                  <p className="font-semibold">
                    <Link
                      href={`/${credit.place_type === "accommodation" ? "accommodations" : "destinations"}/${credit.place_id}`}
                      className="underline-offset-2 hover:underline"
                    >
                      {credit.place_name}
                    </Link>
                  </p>
                  <p className="mt-1 text-sm wrap-anywhere text-white/80">{credit.credit_line}</p>
                  <p className="mt-1 text-sm text-white/80">
                    Licence: {licenceLabels[credit.licence] ?? credit.licence}
                    {credit.source_url && (
                      <>
                        {" · "}
                        <a
                          href={credit.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline underline-offset-2 hover:text-white"
                        >
                          Original photo
                          <span className="sr-only"> of {credit.place_name} (opens in a new tab)</span>
                        </a>
                      </>
                    )}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        )}
        {failed && (
          <p role="status" className="mb-8 text-sm text-white/75">
            Some photo credits could not be loaded right now. Please reload the page in a moment.
          </p>
        )}

        {saved.length > 0 && (
          <h2 className="font-fraunces mb-4 text-2xl font-medium">From Wikimedia Commons</h2>
        )}
        <ul className="space-y-3">
          {photoCredits.map((credit) => (
            <li
              key={credit.source}
              className="rounded-2xl border border-white/20 bg-white/10 p-4 sm:p-5"
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
