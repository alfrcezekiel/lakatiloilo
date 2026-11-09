import {
  ForbiddenException,
  HttpException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { TravelerTransactions } from './traveler-transactions';
import { TokenMemory } from './token-memory';

// "Is this login an admin's?" is remembered for 30 seconds, never past the
// token's own expiry (slow admin pages, team report 2026-11-09; see
// token-memory.ts). Removing someone from the admins table takes effect on
// the dashboard within this time; Row Level Security in the database
// checks is_admin() on every read and change regardless.

// "Is the person with this login an admin?" (admin dashboard &
// moderation round, ticket 107). Asks the database's own is_admin()
// (supabase/sql/038) AS that person, so the admins table and its Row
// Level Security decide, never something the browser sends. Every admin
// endpoint calls requireAdmin first; the database checks again on every
// change in the next tickets.
export const notForTravelers = () =>
  new ForbiddenException('This page is for the Lakat Iloilo team.');

@Injectable()
export class AdminAccess {
  private readonly logger = new Logger(AdminAccess.name);

  // Answers already asked for, under a fingerprint of the token.
  private readonly remembered = new TokenMemory<boolean>(200);

  constructor(private readonly travelerTransactions: TravelerTransactions) {}

  // True or false for a valid login; 401 for a login Supabase refuses.
  // Remembered for 30 seconds, so one page that makes several admin
  // requests asks the database once.
  async isAdmin(accessToken: string): Promise<boolean> {
    const known = this.remembered.get(accessToken);
    if (known !== undefined) return known;
    const admin = await this.askDatabase(accessToken);
    this.remembered.set(accessToken, admin);
    return admin;
  }

  // Forgets a remembered answer (after logging out).
  forget(accessToken: string) {
    this.remembered.forget(accessToken);
  }

  private askDatabase(accessToken: string): Promise<boolean> {
    return this.travelerTransactions.run(
      accessToken,
      async (runner) => {
        const [row]: { is_admin: boolean }[] = await runner.query(
          'select public.is_admin() as is_admin',
        );
        return row?.is_admin === true;
      },
      (error) => {
        if (error instanceof HttpException) return error;
        this.logger.error(`Could not check admin: ${String(error)}`);
        return new ServiceUnavailableException('Something went wrong. Please try again.');
      },
    );
  }

  // 403 "This page is for the Lakat Iloilo team." for anyone who is not an
  // admin (401 first for a missing or refused login).
  async requireAdmin(accessToken: string): Promise<void> {
    if (!(await this.isAdmin(accessToken))) throw notForTravelers();
  }
}
