import {
  ForbiddenException,
  HttpException,
  type Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { QueryFailedError } from 'typeorm';

// The Postgres error code of a refused database command ("23514" a check,
// "23503" a missing link, "23505" a duplicate, "42501" no permission), or
// undefined for anything else.
export const databaseErrorCode = (error: unknown) =>
  error instanceof QueryFailedError
    ? (error.driverError as { code?: string } | undefined)?.code
    : undefined;

// Turns what went wrong inside an admin's database work into the answer
// the website shows (shared by the admin services since the code review
// of 2026-11-11; it was copied in four places):
//   - an answer the code already chose (404, 400, ...) stays as it is,
//   - a database refusal listed in `refusals` gets that service's own
//     plain sentence,
//   - "no permission" (Row Level Security, 42501) is 403 "This page is
//     for the Lakat Iloilo team.",
//   - anything else is logged and becomes 503 "Something went wrong.
//     Please try again." (never the database's own text).
export function httpErrorFrom(
  error: unknown,
  logger: Logger,
  what: string,
  refusals: Partial<Record<string, () => HttpException>> = {},
): HttpException {
  if (error instanceof HttpException) return error;
  const code = databaseErrorCode(error);
  const refusal = code ? refusals[code] : undefined;
  if (refusal) return refusal();
  if (code === '42501') return new ForbiddenException('This page is for the Lakat Iloilo team.');
  logger.error(`Could not ${what}: ${String(error)}`);
  return new ServiceUnavailableException('Something went wrong. Please try again.');
}
