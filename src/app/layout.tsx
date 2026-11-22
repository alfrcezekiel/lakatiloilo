import type { Metadata } from "next";
import { connection } from "next/server";
import { Fraunces, IBM_Plex_Mono, Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";

const fraunces = Fraunces({
  subsets: ["latin"],
  // Italic is loaded too, for the "Iloilo." in the hero headline.
  style: ["normal", "italic"],
  variable: "--font-fraunces",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

// The small uppercase labels on the detail pages (glass detail pages round).
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["500"],
  variable: "--font-plex-mono",
  display: "swap",
});

// TODO: change these to your app's name and description.
export const metadata: Metadata = {
  title: "Lakat Iloilo",
  description: "Your guide to exploring Iloilo City and Iloilo Province",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Build every page per visit, never ahead of time (ZAP baseline
  // 2026-11-20). The Content-Security-Policy gives each page view a new
  // one-time code (a nonce, src/proxy.ts) that Next.js stamps on the
  // page's scripts; a page built ahead of time would carry no code and
  // its scripts would be refused. Side effect: Vercel no longer serves
  // pre-built pages such as /login with "Access-Control-Allow-Origin: *".
  await connection();

  return (
    <html lang="en" className="h-full antialiased">
      <body className={`${fraunces.variable} ${inter.variable} ${plexMono.variable} min-h-full flex flex-col`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
