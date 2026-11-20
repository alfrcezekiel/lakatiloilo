import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { configureApp } from './app-setup';

// Importing AppModule runs ConfigModule.forRoot, which loads backend/.env
// into process.env, so the variables below are available on your computer.
// On Vercel they come from the project's Environment Variables instead.

// Websites allowed to call this API straight from a browser (CORS), read
// from the optional CORS_ORIGIN variable as a comma-separated list.
// Since the security hardening round (tickets 151–153) no browser calls
// the backend: the website's server passes the requests on (/api), and a
// server-to-server call needs no CORS. So CORS_ORIGIN is best left unset:
// then no other website's page can call this API from a visitor's browser
// (code review 2026-11-20). Set it only if a browser must call directly.
const corsOrigins = (): string[] =>
  (process.env.CORS_ORIGIN ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

const bootstrap = async () => {
  const origins = corsOrigins();
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  // Security headers, CORS and the "unknown address" answer (app-setup.ts,
  // shared with the API tests).
  configureApp(app, origins);
  // Vercel (and most hosts) tell the app which port to use through PORT.
  // On your computer PORT may be unset, so it falls back to 5000.
  const port = process.env.PORT ?? 5000;
  await app.listen(port);
  new Logger('Bootstrap').log(`Backend is listening on http://localhost:${port}`);
};
bootstrap();
