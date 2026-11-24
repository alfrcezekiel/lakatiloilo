// Gives the backend's lakat_api role its password on the LOCAL Supabase
// database, using the value in backend/.env.local. A reset rebuilds the role
// without a password, so `npm run db:reset` runs this afterwards.
//
// It only talks to the local Docker container, and refuses to run unless
// backend/.env.local points at the local database.
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

const fail = (message) => {
  console.error(message);
  process.exit(1);
};

let env;
try {
  env = readFileSync(new URL("../backend/.env.local", import.meta.url), "utf8");
} catch {
  fail("backend/.env.local was not found. Copy backend/.env.example first.");
}

const value = env.match(/^DATABASE_URL=(.*)$/m)?.[1]?.trim().replace(/^"|"$/g, "");
let url;
try {
  url = new URL(value);
} catch {
  fail("DATABASE_URL in backend/.env.local is not a valid address.");
}

if (!["127.0.0.1", "localhost"].includes(url.hostname) || url.port !== "54322" || url.username !== "lakat_api") {
  fail("Stopped: backend/.env.local must use lakat_api on the local database (127.0.0.1:54322).");
}
// Letters and numbers only, so it is safe inside the SQL below.
if (!/^[a-zA-Z0-9]{16,}$/.test(url.password)) {
  fail("Stopped: the local lakat_api password must be at least 16 letters or numbers.");
}

// Sent through stdin, so the password never appears in a process list.
const result = spawnSync(
  "docker",
  ["exec", "-i", "supabase_db_lakatiloilo", "psql", "-U", "postgres", "-d", "postgres", "-q", "-v", "ON_ERROR_STOP=1"],
  { input: `alter role lakat_api with password '${url.password}';\n`, encoding: "utf8" },
);
if (result.status !== 0) {
  fail("Could not set the local login. Is the local Supabase stack running (npx supabase start)?");
}
console.log("Local lakat_api login is ready.");
