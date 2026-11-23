import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { configureApp } from './app-setup';
import { parseOrigins } from './config/env.validation';

// Importing AppModule loads and checks the settings (config/env.validation.ts).
// Local development uses backend/.env.local; staging and production use the
// variables set on their host.

const bootstrap = async () => {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);
  // On a host, trust only the one proxy in front of the app, so the rate
  // limit sees the caller's address. Locally nobody sits in front of it, and
  // trusting the header would let a caller fake their address.
  if (config.getOrThrow<string>('APP_ENV') !== 'local') {
    app.set('trust proxy', 1);
  }
  // Websites allowed to call this API straight from a browser. Blank is the
  // normal setup: browsers go through the website's /api proxy (tickets
  // 151–153), and a server-to-server call needs no CORS.
  const origins = parseOrigins(config.getOrThrow<string>('CORS_ORIGINS'));
  // Security headers, CORS and the "unknown address" answer (app-setup.ts,
  // shared with the API tests).
  configureApp(app, origins);
  const port = Number(config.getOrThrow<string>('PORT'));
  await app.listen(port);
  new Logger('Bootstrap').log(`Backend is listening on http://localhost:${port}`);
};
bootstrap();
