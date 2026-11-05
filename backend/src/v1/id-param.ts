import { BadRequestException, NotFoundException, ParseUUIDPipe } from '@nestjs/common';

// Checks that an id in the address is a real id (a UUID) before it reaches
// the database. Shared by every endpoint with an :id, like login-token.ts.
//
// A badly formatted id (for example /v1/reviews/abc) cannot belong to
// anything, so the answer is 404 with a plain sentence, the same as an id
// that is well formed but unknown. Before, NestJS answered 400
// "Validation failed (uuid is expected)" (evaluation A1, 2026-11-04).
export const idOf = (what: string) =>
  new ParseUUIDPipe({
    exceptionFactory: () => new NotFoundException(`We couldn't find that ${what}.`),
  });

// The same check for ?place_id= on GET /v1/reviews: a missing or badly
// formatted place is a mistake in the question, so 400.
export const placeIdQuery = () =>
  new ParseUUIDPipe({
    exceptionFactory: () => new BadRequestException('Please choose a destination or accommodation.'),
  });
