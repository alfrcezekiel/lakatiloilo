import { describe, expect, it } from '@jest/globals';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { idOf, placeIdQuery } from './id-param';

const REAL_ID = '5d1155a1-6e40-417d-9c84-09a990cae00d';
const asParam = { type: 'param' as const };
const asQuery = { type: 'query' as const };

describe('idOf (an :id in the address)', () => {
  it('lets a real id (a UUID) through unchanged', async () => {
    await expect(idOf('review').transform(REAL_ID, asParam)).resolves.toBe(REAL_ID);
  });

  it.each(['abc', '123', `${REAL_ID}x`, "1' or '1'='1"])(
    'answers 404 "We couldn\'t find that review." for the badly formatted id %p',
    async (badId) => {
      const check = idOf('review').transform(badId, asParam);
      await expect(check).rejects.toThrow(NotFoundException);
      await expect(idOf('review').transform(badId, asParam)).rejects.toThrow(
        "We couldn't find that review.",
      );
    },
  );

  it('names the thing that was asked for in the sentence', async () => {
    await expect(idOf('destination').transform('abc', asParam)).rejects.toThrow(
      "We couldn't find that destination.",
    );
  });
});

describe('placeIdQuery (?place_id= on GET /v1/reviews)', () => {
  it('lets a real place id through unchanged', async () => {
    await expect(placeIdQuery().transform(REAL_ID, asQuery)).resolves.toBe(REAL_ID);
  });

  it.each([undefined, '', 'abc', '1'])(
    'answers 400 "Please choose a destination or accommodation." for %p',
    async (badId) => {
      await expect(placeIdQuery().transform(badId as string, asQuery)).rejects.toThrow(
        BadRequestException,
      );
      await expect(placeIdQuery().transform(badId as string, asQuery)).rejects.toThrow(
        'Please choose a destination or accommodation.',
      );
    },
  );
});
