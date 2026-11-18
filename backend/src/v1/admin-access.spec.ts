import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { AdminAccess } from './admin-access';
import { TravelerTransactions } from './traveler-transactions';

const NOW = new Date('2026-11-17T08:00:00Z').getTime();

// A pretend login token that runs out in an hour. It is never sent anywhere.
const tokenFor = (who: string) =>
  `header.${Buffer.from(JSON.stringify({ sub: who, exp: (NOW + 3_600_000) / 1000 })).toString('base64url')}.sig`;

// A pretend TravelerTransactions: answers is_admin() as the database would.
const fakeTransactions = (isAdmin: boolean | 'refused-login') => {
  const run = jest.fn(async (_token: string, work: (runner: unknown) => Promise<unknown>) => {
    if (isAdmin === 'refused-login') throw new UnauthorizedException('Please log in again, then try again.');
    return work({ query: async () => [{ is_admin: isAdmin }] });
  });
  return { run } as unknown as TravelerTransactions & { run: jest.Mock };
};

describe('AdminAccess', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(NOW);
  });
  afterEach(() => jest.useRealTimers());

  it('lets an admin through', async () => {
    const access = new AdminAccess(fakeTransactions(true));
    await expect(access.requireAdmin(tokenFor('admin'))).resolves.toBeUndefined();
  });

  it('refuses a traveler with 403 "This page is for the Lakat Iloilo team."', async () => {
    const access = new AdminAccess(fakeTransactions(false));

    await expect(access.requireAdmin(tokenFor('traveler'))).rejects.toThrow(ForbiddenException);
    await expect(access.requireAdmin(tokenFor('traveler'))).rejects.toThrow(
      'This page is for the Lakat Iloilo team.',
    );
  });

  it('refuses a login Supabase does not accept with 401, not 403', async () => {
    const access = new AdminAccess(fakeTransactions('refused-login'));
    await expect(access.requireAdmin('fake')).rejects.toThrow(UnauthorizedException);
  });

  it('asks the database once when one page makes several admin requests', async () => {
    const transactions = fakeTransactions(true);
    const access = new AdminAccess(transactions);
    const token = tokenFor('admin');

    await access.isAdmin(token);
    await access.isAdmin(token);
    await access.isAdmin(token);

    expect(transactions.run).toHaveBeenCalledTimes(1);
  });

  it('asks again after 30 seconds, so removing an admin takes effect', async () => {
    const transactions = fakeTransactions(true);
    const access = new AdminAccess(transactions);
    const token = tokenFor('admin');

    await access.isAdmin(token);
    jest.advanceTimersByTime(30_001);
    await access.isAdmin(token);

    expect(transactions.run).toHaveBeenCalledTimes(2);
  });

  it('asks again straight away after logging out', async () => {
    const transactions = fakeTransactions(true);
    const access = new AdminAccess(transactions);
    const token = tokenFor('admin');

    await access.isAdmin(token);
    access.forget(token);
    await access.isAdmin(token);

    expect(transactions.run).toHaveBeenCalledTimes(2);
  });
});
