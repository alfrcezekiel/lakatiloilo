// The middle-man between the browser and the NestJS backend (ticket 151).
//
// The browser calls /api/v1/... on our own website; this route, running on
// the Vercel server, makes the real call to the backend and hands back its
// answer. The backend's address lives only in the server-side API_URL
// variable, so it never reaches a visitor's browser.
//
// It is deliberately strict, so it can never become an "open proxy" that
// reaches places we did not mean to expose (SSRF):
//   - only paths starting with v1/ are forwarded, never one with ".." in it;
//   - only GET, POST, PUT, PATCH and DELETE (Next.js answers 405 to others);
//   - only a short list of request and response headers is passed on.
// (/api/wikimedia-photo is its own route, and a fixed route always wins
// over this catch-all one.)

import { backendPassHeaders } from "@/lib/backend-headers";

type Context = { params: Promise<{ path: string[] }> };

// As long as the longest wait the browser allows (photo uploads, 60 s in
// src/lib/api.ts): a shorter one would cut off a slow upload that the
// backend is still saving (code review 2026-11-20). Everyday calls give up
// sooner on their own (axios, 10 s). Vercel lets a function run 300 s.
const TIMEOUT_MS = 60_000;
const REQUEST_HEADERS = ["authorization", "content-type", "accept", "x-forwarded-for"];
const RESPONSE_HEADERS = ["content-type", "cache-control"];

const jsonError = (status: number, message: string) => Response.json({ message }, { status });

async function forward(request: Request, { params }: Context) {
  const { path } = await params;
  const joined = path.join("/");
  if (!joined.startsWith("v1/") || path.some((part) => part === ".." || part === "." || part.includes("\\"))) {
    return jsonError(404, "Not found");
  }

  const backend = process.env.API_URL;
  if (!backend) {
    console.error("[api proxy] API_URL is not set. Add it to .env.local and to Vercel.");
    return jsonError(500, "Server is not configured");
  }

  // Each part is encoded again, so an id can never change the path.
  const target = `${backend.replace(/\/+$/, "")}/${path.map(encodeURIComponent).join("/")}${new URL(request.url).search}`;

  const headers = new Headers();
  for (const name of REQUEST_HEADERS) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  // Added here on the server, after the short list, so a browser can never
  // send or read it (staging only, see backend-headers.ts).
  for (const [name, value] of Object.entries(backendPassHeaders())) headers.set(name, value);

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method: request.method,
      headers,
      // Raw bytes, not text: decoding as text would corrupt photo uploads.
      // Vercel caps a request body at 4.5 MB; the backend allows 4 MB photos.
      body: request.method === "GET" || request.method === "HEAD" ? undefined : await request.arrayBuffer(),
      cache: "no-store",
      redirect: "manual",
      // Stops when the time is up, or as soon as the browser gives up or
      // leaves the page, so the server never waits for nobody.
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(TIMEOUT_MS)]),
    });
  } catch (error) {
    // AbortSignal.timeout throws a DOMException named TimeoutError.
    if ((error as { name?: unknown } | null)?.name === "TimeoutError") {
      return jsonError(504, "The server took too long to answer");
    }
    return jsonError(502, "Could not reach the server");
  }

  const responseHeaders = new Headers();
  for (const name of RESPONSE_HEADERS) {
    const value = upstream.headers.get(name);
    if (value) responseHeaders.set(name, value);
  }
  // 204 and 304 must have no body (passing one throws).
  const body = upstream.status === 204 || upstream.status === 304 ? null : upstream.body;
  return new Response(body, { status: upstream.status, headers: responseHeaders });
}

export const GET = forward;
export const POST = forward;
export const PUT = forward;
export const PATCH = forward;
export const DELETE = forward;
