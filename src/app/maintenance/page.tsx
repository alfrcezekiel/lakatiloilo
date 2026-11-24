import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { env, maybe } from "@/env";

export const metadata: Metadata = {
  title: "Back soon · Lakat Iloilo",
  robots: { index: false, follow: false },
};

// Shown for every page while MAINTENANCE_MODE is "true" (src/proxy.ts
// sends visitors here with status 503). No data and no backend calls, so it
// still works when the backend or database is the thing being fixed.
// Outside maintenance, /maintenance is just "page not found".
export default function MaintenancePage() {
  if (maybe(() => env.MAINTENANCE_MODE) !== true) notFound();

  return (
    <main className="flex min-h-screen items-center justify-center bg-linear-to-br from-teal-950 via-teal-900 to-[#ff6f59]/60 px-4 py-16 text-white">
      <div className="max-w-xl text-center">
        <p className="font-mono-label text-xs text-[#ff6f59]">Lakat Iloilo</p>
        <h1 className="mt-4 font-fraunces text-4xl font-medium sm:text-5xl">
          We&apos;re making a few <em className="text-[#ff6f59]">improvements</em>
        </h1>
        <p className="mt-4 text-white/80">
          The site is down for a short update. Please come back in a little while to keep exploring
          Iloilo City and Iloilo Province.
        </p>
      </div>
    </main>
  );
}
