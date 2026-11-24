import * as z from "zod/mini";

// Every environment variable the website reads, checked in one place.
//
// An environment variable is a setting that lives outside the code: in
// .env.local on your computer, and in Vercel (Project -> Settings ->
// Environment Variables) for the live site. See .env.example for what each
// one is and where its value comes from.
//
// How it works:
//   - The SCHEMAS below say what each variable must look like (Zod is the
//     library that checks it). A missing or badly shaped value is an error
//     with a plain message naming the variable.
//   - checkEnv() checks them all at once. next.config.ts calls it, so
//     `npm run dev` and `npm run build` (and so every Vercel deploy) stop
//     straight away with the list of what is missing, instead of the site
//     breaking later on one page.
//   - `env.X` reads one variable when the code needs it, and checks it
//     again. Use it instead of process.env everywhere in src/.
//
// Only NEXT_PUBLIC_ variables reach the browser: Next.js copies their
// values into the JavaScript a visitor downloads, so they must never be
// secrets. Everything in serverSchema stays on the server. Never add the
// Supabase service_role key or any sb_secret_ key here.
//
// "zod/mini" is the small version of Zod: this file is also part of the
// browser's JavaScript, and the full Zod would add tens of kilobytes.

const text = z.string().check(z.trim(), z.minLength(1));

// Copied into the browser's JavaScript. Public values only.
const publicSchema = z.object({
  // Which copy of the site this is. "staging" shows the STAGING badge and
  // asks search engines not to list the site (src/app/layout.tsx).
  NEXT_PUBLIC_APP_ENV: z.enum(["development", "staging", "production"]),
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  // The publishable (anon) key. Safe in the browser: Row Level Security
  // decides what it may read and write.
  NEXT_PUBLIC_SUPABASE_ANON_KEY: text,
  // Mapbox's public token (starts with pk.), for the maps on place pages.
  NEXT_PUBLIC_MAPBOX_TOKEN: text,
});

// Server only. Never add NEXT_PUBLIC_ to these.
const serverSchema = z.object({
  // The NestJS backend's address. The browser never sees it: it calls /api
  // on our own site, and the website's server passes the call on.
  API_URL: z.url(),
  // Staging only: the pass for Vercel's login screen in front of the
  // staging backend (src/lib/backend-headers.ts). A secret.
  BACKEND_PROTECTION_BYPASS: z.optional(text),
  // "true" shows the maintenance page for every page of the site
  // (src/proxy.ts). Leave it out, or "false", normally.
  MAINTENANCE_MODE: z._default(z.enum(["true", "false"]), "false"),
});

type PublicEnv = z.output<typeof publicSchema>;
type ServerEnv = z.output<typeof serverSchema>;
type Name = keyof PublicEnv | keyof ServerEnv;

const schemas = { ...publicSchema.shape, ...serverSchema.shape };

// An empty value ("API_URL=" in a file) counts as missing.
function problem(name: Name, value: string | undefined): string | null {
  const result = schemas[name].safeParse(value?.trim() === "" ? undefined : value);
  if (result.success) return null;
  if (value === undefined || value.trim() === "") return `${name} is missing`;
  return `${name} is not valid (${result.error.issues[0]?.message ?? "wrong format"})`;
}

function read<N extends Name>(name: N, value: string | undefined): (PublicEnv & ServerEnv)[N] {
  const message = problem(name, value);
  if (message) throw new Error(`${message}. Add it to .env.local and to Vercel (see .env.example).`);
  const clean = value?.trim() === "" ? undefined : value;
  return schemas[name].parse(clean) as (PublicEnv & ServerEnv)[N];
}

// In the browser a server-only value is always missing (Next.js never sends
// it there), so say that instead of "add it to .env.local".
function serverOnly<N extends keyof ServerEnv>(name: N, value: string | undefined) {
  try {
    return read(name, value);
  } catch (error) {
    if (typeof window !== "undefined" && value === undefined) {
      throw new Error(`${name} is server-only and can't be read in the browser.`);
    }
    throw error;
  }
}

// Each line names process.env.X in full on purpose: Next.js only copies a
// NEXT_PUBLIC_ value into the browser's code when it sees it written out.
export const env = {
  get NEXT_PUBLIC_APP_ENV() {
    return read("NEXT_PUBLIC_APP_ENV", process.env.NEXT_PUBLIC_APP_ENV);
  },
  get NEXT_PUBLIC_SUPABASE_URL() {
    return read("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL);
  },
  get NEXT_PUBLIC_SUPABASE_ANON_KEY() {
    return read("NEXT_PUBLIC_SUPABASE_ANON_KEY", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  },
  get NEXT_PUBLIC_MAPBOX_TOKEN() {
    return read("NEXT_PUBLIC_MAPBOX_TOKEN", process.env.NEXT_PUBLIC_MAPBOX_TOKEN);
  },
  get API_URL() {
    return serverOnly("API_URL", process.env.API_URL);
  },
  get BACKEND_PROTECTION_BYPASS() {
    return serverOnly("BACKEND_PROTECTION_BYPASS", process.env.BACKEND_PROTECTION_BYPASS);
  },
  get MAINTENANCE_MODE() {
    return serverOnly("MAINTENANCE_MODE", process.env.MAINTENANCE_MODE) === "true";
  },
  // Set by Next.js itself: "development" for `npm run dev`, "production"
  // for a build, "test" in Vitest.
  get NODE_ENV() {
    return process.env.NODE_ENV;
  },
  get isStaging() {
    return this.NEXT_PUBLIC_APP_ENV === "staging";
  },
};

// For code that has its own friendly fallback when a value is missing (no
// map, "server is not configured"): the value, or undefined instead of an
// error. Example: maybe(() => env.API_URL)
export function maybe<T>(readValue: () => T): T | undefined {
  try {
    return readValue();
  } catch {
    return undefined;
  }
}

// Checks every variable at once and throws one error listing all the
// problems. Called from next.config.ts, so dev and build stop early.
export function checkEnv() {
  const problems = (Object.keys(schemas) as Name[])
    .map((name) => problem(name, process.env[name]))
    .filter((message): message is string => message !== null);
  if (problems.length > 0) {
    throw new Error(
      [
        "Environment variables are missing or wrong:",
        ...problems.map((message) => `  - ${message}`),
        "Copy .env.example to .env.local and fill them in. For the live site,",
        "add them in Vercel (Project -> Settings -> Environment Variables), then redeploy.",
      ].join("\n"),
    );
  }
}
