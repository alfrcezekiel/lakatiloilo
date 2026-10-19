import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

// Importing AppModule runs ConfigModule.forRoot, which loads backend/.env
// into process.env, so the variables below are available on your computer.
// On Vercel they come from the project's Environment Variables instead.

// Websites allowed to call this API from the browser (CORS), read from the
// CORS_ORIGIN environment variable as a comma-separated list, e.g.
// CORS_ORIGIN=http://localhost:3000,https://lakat-iloilo.vercel.app
const corsOrigins = (): string[] => {
  const origins = (process.env.CORS_ORIGIN ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  if (origins.length === 0) {
    throw new Error(
      'CORS_ORIGIN is not set. Add it to backend/.env (see .env.example).',
    );
  }
  return origins;
};

const bootstrap = async () => {
  // Read before starting Nest, so a missing CORS_ORIGIN fails straight away.
  const origins = corsOrigins();
  const app = await NestFactory.create(AppModule);
  // The API is read-only, so browsers only need GET.
  app.enableCors({ origin: origins, methods: ['GET'] });
  // Vercel (and most hosts) tell the app which port to use through PORT.
  // On your computer PORT may be unset, so it falls back to 5000.
  const port = process.env.PORT ?? 5000;
  await app.listen(port);
  new Logger('Bootstrap').log(`Backend is listening on http://localhost:${port}`);
};
bootstrap();
