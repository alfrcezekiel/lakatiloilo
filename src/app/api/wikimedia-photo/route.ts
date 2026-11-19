const ALLOWED_THUMBNAIL_PATH =
  /^\/wikipedia\/commons\/thumb\/[a-f0-9]\/([a-f0-9]{2})\/[^/]+\/\d+px-[^/]+$/i;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set([
  "image/avif",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

// Serve Wikimedia thumbnail bytes from this site's origin. The browser then
// never receives Wikimedia's Set-Cookie headers, and Vercel can cache the
// response close to travelers. Wikimedia attribution remains on the page.
export async function GET(request: Request) {
  const path = new URL(request.url).searchParams.get("path");
  if (!path || path.includes("..") || path.includes("\\") || !ALLOWED_THUMBNAIL_PATH.test(path)) {
    return new Response("Not found", { status: 404 });
  }

  let upstream: Response;
  try {
    upstream = await fetch(`https://thumb.wikimedia.org${path}`, {
      cache: "force-cache",
      redirect: "error",
      signal: AbortSignal.timeout(8_000),
    });
  } catch {
    return new Response("Photo unavailable", { status: 502 });
  }

  if (!upstream.ok) return new Response("Photo unavailable", { status: upstream.status });

  const contentType = upstream.headers.get("content-type")?.split(";")[0].trim().toLowerCase();
  const contentLength = Number(upstream.headers.get("content-length") ?? 0);
  if (!contentType || !ALLOWED_IMAGE_TYPES.has(contentType) || contentLength > MAX_IMAGE_BYTES) {
    return new Response("Photo unavailable", { status: 502 });
  }

  const image = await upstream.arrayBuffer();
  if (image.byteLength > MAX_IMAGE_BYTES) return new Response("Photo unavailable", { status: 502 });

  return new Response(image, {
    headers: {
      "Cache-Control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=2592000",
      "Content-Length": String(image.byteLength),
      "Content-Type": contentType,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
