// `npm run dev:staging`: the website on your laptop, but using STAGING's
// backend and Supabase project instead of your own backend on
// localhost:5000. The values come from .env.staging.local (copy
// .env.staging.example). .env.local is not changed: stop with Ctrl+C and run
// `npm run dev` to go back.
//
// How: Next.js lets a value set when the command starts win over the same
// value in .env.local. So this script reads .env.staging.local and starts
// `next dev` with those values set. Anything not in .env.staging.local (the
// Mapbox token, MAINTENANCE_MODE) still comes from .env.local.
//
// It refuses to start if the file is missing, is not marked staging, points
// at localhost, or holds a key that skips Row Level Security.
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { parseEnv } from "node:util";

const FILE = ".env.staging.local";

const fail = (message) => {
  console.error(`\n[dev:staging] ${message}\n`);
  process.exit(1);
};

let values;
try {
  values = parseEnv(readFileSync(new URL(`../${FILE}`, import.meta.url), "utf8"));
} catch {
  fail(`${FILE} was not found. Copy .env.staging.example to ${FILE} and fill it in (see README.md).`);
}

if (values.NEXT_PUBLIC_APP_ENV !== "staging") {
  fail(`${FILE} must say NEXT_PUBLIC_APP_ENV=staging, so the STAGING badge shows which site you are on.`);
}
for (const name of ["API_URL", "NEXT_PUBLIC_SUPABASE_URL"]) {
  if (/localhost|127\.0\.0\.1/.test(values[name] ?? "")) {
    fail(`${name} in ${FILE} points at your own computer. Use staging's address, or just run \`npm run dev\`.`);
  }
}

// A Supabase key whose payload says role "service_role", or a new-style
// sb_secret_ key, skips Row Level Security. It never belongs in this project.
const skipsRls = (value) => {
  if (value.startsWith("sb_secret_")) return true;
  try {
    const payload = JSON.parse(Buffer.from(value.split(".")[1] ?? "", "base64url").toString("utf8"));
    return payload?.role === "service_role";
  } catch {
    return false;
  }
};
for (const [name, value] of Object.entries(values)) {
  if (skipsRls(value)) fail(`${name} in ${FILE} is a secret Supabase key. Use the publishable (anon) key only.`);
}

const host = (url) => {
  try {
    return new URL(url).host;
  } catch {
    return "(not a valid address)";
  }
};
console.log(`\n[dev:staging] Website on your laptop, using STAGING:`);
console.log(`  backend:  ${host(values.API_URL)}`);
console.log(`  Supabase: ${host(values.NEXT_PUBLIC_SUPABASE_URL)}`);
console.log(`  Anything you save is really saved on staging.\n`);

// Start Next.js's own dev command with the staging values. Extra words are
// passed on, e.g. `npm run dev:staging -- -p 3001` for another port.
const nextBin = createRequire(import.meta.url).resolve("next/dist/bin/next");
const child = spawn(process.execPath, [nextBin, "dev", ...process.argv.slice(2)], {
  stdio: "inherit",
  env: { ...process.env, ...values },
});
child.on("exit", (code, signal) => process.exit(signal ? 1 : (code ?? 0)));
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal));
