// The pass that lets the website's SERVER reach a backend protected by
// Vercel's login screen (staging only). A visitor's browser is logged in to
// nothing, and the website's server isn't either, so without this pass every
// call from the staging website to the staging backend is stopped.
//
// BACKEND_PROTECTION_BYPASS is a secret. It has no NEXT_PUBLIC_ prefix, so
// Next.js never copies it into the JavaScript a visitor downloads, and this
// function also returns nothing when it runs in a browser. It is set only for
// the staging branch on Vercel. Production and localhost do not have it.
export const backendPassHeaders = (): Record<string, string> => {
  if (typeof window !== "undefined") return {};
  const secret = process.env.BACKEND_PROTECTION_BYPASS;
  return secret ? { "x-vercel-protection-bypass": secret } : {};
};
