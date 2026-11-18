// Runs before every frontend test file (vitest.config.mts, setupFiles).
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterAll, afterEach, beforeAll } from "vitest";
import { server } from "./mocks/server";

// The pretend backend: on before the tests, back to its starting answers
// after each one, off at the end. A request no test expected fails the
// test, so nothing can quietly reach a real address.
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  server.resetHandlers();
  cleanup();
});
afterAll(() => server.close());
