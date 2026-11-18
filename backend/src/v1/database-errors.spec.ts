import { describe, expect, it, jest } from '@jest/globals';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { databaseErrorCode, httpErrorFrom } from './database-errors';

// A database refusal the way TypeORM reports it, with a Postgres error code.
const refusedBy = (code: string, message = 'secret database detail: relation "admins"') =>
  new QueryFailedError('select 1', [], Object.assign(new Error(message), { code }));

const quietLogger = () => ({ error: jest.fn() }) as unknown as Logger & { error: jest.Mock };

describe('databaseErrorCode', () => {
  it('reads the Postgres code from a refused database command', () => {
    expect(databaseErrorCode(refusedBy('23505'))).toBe('23505');
  });

  it('answers undefined for any other kind of error', () => {
    expect(databaseErrorCode(new Error('network down'))).toBeUndefined();
    expect(databaseErrorCode('just text')).toBeUndefined();
    expect(databaseErrorCode(undefined)).toBeUndefined();
  });
});

describe('httpErrorFrom', () => {
  it('keeps an answer the code already chose (for example 404) as it is', () => {
    const chosen = new NotFoundException("We couldn't find that review.");
    expect(httpErrorFrom(chosen, quietLogger(), 'hide a review')).toBe(chosen);
  });

  it("uses the service's own sentence for a refusal it lists", () => {
    const error = httpErrorFrom(refusedBy('23505'), quietLogger(), 'add a category', {
      '23505': () => new ConflictException('That category already exists.'),
    });
    expect(error).toBeInstanceOf(ConflictException);
    expect(error.message).toBe('That category already exists.');
  });

  it('turns "no permission" from Row Level Security (42501) into 403 for the team only', () => {
    const error = httpErrorFrom(refusedBy('42501'), quietLogger(), 'hide a review');
    expect(error).toBeInstanceOf(ForbiddenException);
    expect(error.message).toBe('This page is for the Lakat Iloilo team.');
  });

  it('turns anything else into 503 with a plain sentence and logs the real cause', () => {
    const logger = quietLogger();
    const error = httpErrorFrom(refusedBy('99999'), logger, 'move a place to Trash');

    expect(error).toBeInstanceOf(ServiceUnavailableException);
    expect(error.message).toBe('Something went wrong. Please try again.');
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Could not move a place to Trash'));
  });

  it("never puts the database's own text in the answer", () => {
    const error = httpErrorFrom(refusedBy('99999'), quietLogger(), 'save');
    expect(JSON.stringify(error.getResponse())).not.toContain('secret database detail');
  });

  it('ignores a listed refusal for a different code', () => {
    const error = httpErrorFrom(refusedBy('23503'), quietLogger(), 'save', {
      '23505': () => new BadRequestException('duplicate'),
    });
    expect(error).toBeInstanceOf(ServiceUnavailableException);
  });
});
