import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

// Frontend unit and component tests (layers 1 and 2 in docs/TESTING.md).
// Run with `npm run test`. Backend tests have their own runner (Jest) in
// backend/, and Playwright tests live in e2e/, so only src/ is picked up.
export default defineConfig({
  // tsconfigPaths: understand "@/lib/…" like Next.js does. react: JSX.
  plugins: [tsconfigPaths(), react()],
  test: {
    // A pretend browser page (jsdom), so components can be drawn and clicked.
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}"],
    setupFiles: ["./test/setup.ts"],
    // The backend address the app reads. Nothing listens there: every
    // request is answered by the pretend backend (test/mocks/server.ts).
    env: { NEXT_PUBLIC_API_URL: "http://api.example.test" },
    css: false,
  },
});
