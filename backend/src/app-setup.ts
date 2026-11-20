import type { NestExpressApplication } from '@nestjs/platform-express';
import { UnknownRouteFilter } from './unknown-route.filter';

// What every answer from this backend goes through, whichever way the app
// is started. main.ts calls it for the real backend, and the API tests
// (backend/test/helpers/create-test-app.ts) call it too, so the tests check
// the same headers, CORS and "unknown address" answer as the live site.
// (Moved out of main.ts unchanged, 2026-11-17, for the API tests.)
export function configureApp(app: NestExpressApplication, origins: string[]) {
  // Security headers on every answer (evaluation B5, 2026-11-04): don't
  // announce "X-Powered-By: Express", never let a browser guess a file's
  // type, never let another site show an answer inside a frame, and let a
  // browser run nothing from an answer (CSP).
  app.disable('x-powered-by');
  app.use((_request: unknown, response: { setHeader: (name: string, value: string) => void }, next: () => void) => {
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('X-Frame-Options', 'DENY');
    // A Content-Security-Policy that allows nothing (ZAP baseline,
    // 2026-11-20: "CSP header not set" on the backend's home page). The
    // backend only answers JSON or a plain sentence, never a page with
    // scripts, styles or photos, so a browser that ever opens one of its
    // answers may load and run nothing, and no site may frame it.
    response.setHeader(
      'Content-Security-Policy',
      // base-uri, form-action and frame-ancestors don't fall back to
      // default-src, so each is named (ZAP 2026-11-20).
      "default-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
    );
    next();
  });
  // CORS (which websites may call this API straight from a visitor's
  // browser). No origins, the normal case since ticket 152 (browsers go
  // through the website's /api): CORS stays off and no website may. With
  // origins: browsers on those sites may read (GET), add (POST), replace
  // (PUT, photo credits, ticket 132), edit (PATCH) and delete (DELETE), and
  // send the traveler's login token in the Authorization header.
  if (origins.length > 0) {
    app.enableCors({
      origin: origins,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    });
  }
  // An unknown address answers a plain sentence (unknown-route.filter.ts).
  app.useGlobalFilters(new UnknownRouteFilter());
}
