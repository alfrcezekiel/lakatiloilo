import type { IncomingMessage, ServerResponse } from 'node:http';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter, type NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { configureApp } from './app-setup';
import { parseOrigins } from './config/env.validation';

// This file starts the backend in two ways:
//   - on Vercel, the exported handler answers each request (serverless);
//   - on your computer, app.listen runs a normal server on PORT.
//
// Importing AppModule loads and checks the settings (config/env.validation.ts).
// Local development uses backend/.env.local; staging and production use the
// variables set on their host.

// One Express server, shared by every request this running copy answers.
const adapter = new ExpressAdapter();
const server = adapter.getInstance() as (req: IncomingMessage, res: ServerResponse) => void;

export async function createApp(): Promise<NestExpressApplication> {
  // abortOnError: false, so a failed start can be retried by the next request
  // instead of killing the whole function.
  const app = await NestFactory.create<NestExpressApplication>(AppModule, adapter, { abortOnError: false });
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
  await app.init();
  return app;
}

// The app is built once. Warm requests reuse this same promise, so they skip
// the slow start and do not open new database connections. A failed start is
// forgotten, so the next request can try again.
let appPromise: Promise<NestExpressApplication> | null = null;
const getApp = () => {
  appPromise ??= createApp().catch((error: unknown) => {
    appPromise = null;
    throw error;
  });
  return appPromise;
};

// What Vercel calls for every request.
export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    await getApp();
  } catch (error) {
    // Only the error's type: its text can name the database host.
    new Logger('Bootstrap').error(`The backend could not start (${error instanceof Error ? error.name : 'unknown'}).`);
    res.statusCode = 503;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ message: 'The server is starting. Please try again in a moment.' }));
    return;
  }
  // Stay open until the answer has been sent.
  await new Promise<void>((resolve) => {
    res.once('close', resolve);
    server(req, res);
  });
}

// Only on your computer: Vercel opens its own port and calls the handler.
if (!process.env.VERCEL) {
  getApp()
    .then(async (app) => {
      const port = Number(app.get(ConfigService).getOrThrow<string>('PORT'));
      await app.listen(port);
      new Logger('Bootstrap').log(`Backend is listening on http://localhost:${port}`);
    })
    .catch((error: unknown) => {
      new Logger('Bootstrap').error(error instanceof Error ? error.message : 'The backend could not start.');
      process.exit(1);
    });
}
