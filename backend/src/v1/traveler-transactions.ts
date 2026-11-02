import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, QueryRunner } from 'typeorm';
import { SupabaseService } from '../supabase/supabase.service';

// Runs database work AS the logged-in traveler, so Row Level Security
// decides what they may add, change or delete (backend round, ticket 50).
// Shared by reviews, likes and replies (moved out of the reviews service in
// the review extras round, ticket 79, so replies could use it too).
//
// 1. Supabase Auth checks the login token is genuine and says whose it is.
// 2. Inside one transaction, the database is told which traveler it is
//    ("request.jwt.claims") and switches to Supabase's "authenticated"
//    role, like a request from the website would.
// 3. `work` runs there, so the policies check auth.uid() as usual.
// Any error undoes the whole transaction and is turned into a plain answer
// by `toHttpError`, which each service writes for its own messages.
@Injectable()
export class TravelerTransactions {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly supabase: SupabaseService,
  ) {}

  async run<T>(
    accessToken: string,
    work: (runner: QueryRunner) => Promise<T>,
    toHttpError: (error: unknown) => Error,
  ): Promise<T> {
    const userId = await this.supabase.userIdFor(accessToken);
    if (!userId) throw new UnauthorizedException('Please log in again, then try again.');

    const runner = this.dataSource.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();
    try {
      // "set local" and the "true" below last only until this
      // transaction ends, so the next request starts clean.
      await runner.query(`select set_config('request.jwt.claims', $1, true)`, [
        JSON.stringify({ sub: userId, role: 'authenticated' }),
      ]);
      await runner.query('set local role authenticated');
      const result = await work(runner);
      await runner.commitTransaction();
      return result;
    } catch (error) {
      await runner.rollbackTransaction();
      throw toHttpError(error);
    } finally {
      await runner.release();
    }
  }
}
