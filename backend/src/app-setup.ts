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
  // type, and never let another site show an answer inside a frame.
  app.disable('x-powered-by');
  app.use((_request: unknown, response: { setHeader: (name: string, value: string) => void }, next: () => void) => {
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('X-Frame-Options', 'DENY');
    next();
  });
  // Browsers may read (GET), add (POST), replace (PUT, photo credits,
  // ticket 132), edit (PATCH) and delete (DELETE). The Authorization header carries the traveler's login token.
  app.enableCors({
    origin: origins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
  // An unknown address answers a plain sentence (unknown-route.filter.ts).
  app.useGlobalFilters(new UnknownRouteFilter());
}
