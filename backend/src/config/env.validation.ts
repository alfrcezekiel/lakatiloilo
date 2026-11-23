import { z } from 'zod';

// The settings this backend needs before it may start. If one is missing or
// wrong, the app stops with a list of what to fix. The list names the
// variables but never prints their values, because many of them are secrets.

export const APP_ENVS = ['local', 'staging', 'production'] as const;
export type AppEnv = (typeof APP_ENVS)[number];

const POOLED_DATABASE_PORT = '6543';
const DEFAULT_RATE_LIMIT_PER_MINUTE = '600';

const required = () => z.string({ error: 'is missing' }).trim().min(1, 'is missing');

const parsedUrl = (value: string): URL | null => {
  try {
    return new URL(value);
  } catch {
    return null;
  }
};

// An origin is only a scheme, host and optional port: https://example.com
const isOrigin = (value: string) => {
  const url = parsedUrl(value);
  return !!url && ['http:', 'https:'].includes(url.protocol) && url.origin === value;
};

// CORS_ORIGINS is a comma-separated list. Blank means no website may call
// this API from a browser, the normal setup since tickets 151–153, because
// browsers go through the website's /api proxy.
export const parseOrigins = (value = ''): string[] =>
  value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

const envSchema = z
  .looseObject({
    APP_ENV: z.enum(APP_ENVS, { error: 'must be local, staging or production' }),
    PORT: required().refine((value) => /^\d+$/.test(value) && Number(value) >= 1 && Number(value) <= 65535, {
      error: 'must be a port number from 1 to 65535',
    }),
    DATABASE_URL: required().refine(
      (value) => ['postgres:', 'postgresql:'].includes(parsedUrl(value)?.protocol ?? ''),
      { error: 'must be a postgresql:// address' },
    ),
    SUPABASE_URL: required().refine((value) => ['http:', 'https:'].includes(parsedUrl(value)?.protocol ?? ''), {
      error: 'must be an http:// or https:// address',
    }),
    // The publishable key only. A secret key must never reach this project.
    SUPABASE_ANON_KEY: required().refine((value) => !value.startsWith('sb_secret_'), {
      error: 'must be the publishable (anon) key, never a secret key',
    }),
    CORS_ORIGINS: z
      .string({ error: 'is missing (leave it blank to keep CORS off)' })
      .refine((value) => parseOrigins(value).every(isOrigin), {
        error: 'must be comma-separated origins such as https://example.com',
      }),
    RATE_LIMIT_PER_MINUTE: z
      .string()
      .trim()
      .default(DEFAULT_RATE_LIMIT_PER_MINUTE)
      .refine((value) => /^\d+$/.test(value) && Number(value) >= 1, {
        error: 'must be a whole number of at least 1',
      }),
  })
  .superRefine((env, context) => {
    // The local Supabase stack has its own port. Hosted environments must
    // use the pooler, because serverless copies would otherwise run out of
    // direct database connections.
    if (env.APP_ENV !== 'local' && parsedUrl(env.DATABASE_URL)?.port !== POOLED_DATABASE_PORT) {
      context.addIssue({
        code: 'custom',
        path: ['DATABASE_URL'],
        message: `must use the pooled port ${POOLED_DATABASE_PORT} on staging and production`,
      });
    }
  });

// Staging and production get their settings from the host, never a file.
export const hostProvidesEnv = () =>
  Boolean(process.env.VERCEL) || process.env.APP_ENV === 'staging' || process.env.APP_ENV === 'production';

export function validateEnv(raw: Record<string, unknown>) {
  const result = envSchema.safeParse(raw);
  if (!result.success) {
    const problems = result.error.issues.map((issue) => `  - ${issue.path.join('.')} ${issue.message}`);
    throw new Error(`The backend cannot start. Fix these environment variables:\n${problems.join('\n')}`);
  }
  // A .env.local file may only ever describe local development.
  if (!hostProvidesEnv() && result.data.APP_ENV !== 'local') {
    throw new Error(
      'The backend cannot start. backend/.env.local must use APP_ENV=local. ' +
        'Staging and production get their variables from the host.',
    );
  }
  return result.data;
}
