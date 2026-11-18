import { describe, expect, it, jest } from '@jest/globals';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { SupabaseService } from '../supabase/supabase.service';
import { TravelerTransactions } from './traveler-transactions';

// A pretend database connection that records what was asked of it.
// Each pretend function says what it takes and gives back (<...>), so
// TypeScript can check the test uses it correctly.
type Step = () => Promise<void>;
type Query = (sql: string, params?: string[]) => Promise<unknown[]>;

const fakeRunner = () => ({
  connect: jest.fn<Step>().mockResolvedValue(undefined),
  startTransaction: jest.fn<Step>().mockResolvedValue(undefined),
  commitTransaction: jest.fn<Step>().mockResolvedValue(undefined),
  rollbackTransaction: jest.fn<Step>().mockResolvedValue(undefined),
  release: jest.fn<Step>().mockResolvedValue(undefined),
  query: jest.fn<Query>().mockResolvedValue([]),
});

const setUp = (userId: string | null) => {
  const runner = fakeRunner();
  const dataSource = { createQueryRunner: () => runner } as unknown as DataSource;
  const userIdFor = jest.fn<(token: string) => Promise<string | null>>().mockResolvedValue(userId);
  const supabase = { userIdFor } as unknown as SupabaseService;
  return { runner, transactions: new TravelerTransactions(dataSource, supabase) };
};

const TRAVELER = '11111111-2222-3333-4444-555555555555';
const plainError = () => new BadRequestException('Please try again.');

describe('TravelerTransactions.run', () => {
  it('refuses a login Supabase does not accept with 401, before touching the database', async () => {
    const { runner, transactions } = setUp(null);

    await expect(transactions.run('fake', async () => 'done', plainError)).rejects.toThrow(
      UnauthorizedException,
    );
    expect(runner.connect).not.toHaveBeenCalled();
  });

  it('tells the database who is asking and switches to the "authenticated" role first', async () => {
    const { runner, transactions } = setUp(TRAVELER);

    await transactions.run('token', async () => 'done', plainError);

    const [sql, params] = runner.query.mock.calls[0];
    expect(sql).toContain("set_config('request.jwt.claims', $1, true)");
    expect(sql).toContain("set_config('role', 'authenticated', true)");
    expect(JSON.parse(params?.[0] ?? '')).toEqual({ sub: TRAVELER, role: 'authenticated' });
  });

  it('passes who-is-asking as a parameter ($1), never glued into the SQL', async () => {
    const { runner, transactions } = setUp(TRAVELER);

    await transactions.run('token', async () => 'done', plainError);

    expect(runner.query.mock.calls[0][0]).not.toContain(TRAVELER);
  });

  it('runs the work in one transaction, commits it and gives back its answer', async () => {
    const { runner, transactions } = setUp(TRAVELER);

    const answer = await transactions.run('token', async () => 'saved', plainError);

    expect(answer).toBe('saved');
    expect(runner.startTransaction).toHaveBeenCalledTimes(1);
    expect(runner.commitTransaction).toHaveBeenCalledTimes(1);
    expect(runner.rollbackTransaction).not.toHaveBeenCalled();
    expect(runner.release).toHaveBeenCalledTimes(1);
  });

  it("undoes everything when the work fails, and answers with the service's own error", async () => {
    const { runner, transactions } = setUp(TRAVELER);
    const toHttpError = jest.fn(() => new BadRequestException('Please choose 1 to 5 stars.'));

    await expect(
      transactions.run('token', async () => {
        throw new Error('check constraint "stars"');
      }, toHttpError),
    ).rejects.toThrow('Please choose 1 to 5 stars.');

    expect(runner.rollbackTransaction).toHaveBeenCalledTimes(1);
    expect(runner.commitTransaction).not.toHaveBeenCalled();
    expect(runner.release).toHaveBeenCalledTimes(1);
  });
});
