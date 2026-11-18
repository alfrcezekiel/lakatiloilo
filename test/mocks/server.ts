import { setupServer } from "msw/node";
import { handlers } from "./handlers";

// The pretend backend (MSW, "Mock Service Worker"). It catches every
// request the app's axios client makes in a test and answers it here, so
// tests never reach the real backend or Supabase. Started and reset in
// test/setup.ts; a test adds its own answers with server.use(...).
export const server = setupServer(...handlers);
