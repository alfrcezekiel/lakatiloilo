import { createHash } from 'crypto';

// Helpers for remembering login checks briefly (slow admin pages, team
// report 2026-11-09). Shared by SupabaseService (is this login genuine?)
// and AdminAccess (is it an admin's?), so both treat tokens the same way.
//
// Each running copy of the backend keeps its own memory. Logging out
// forgets the token in the copy that handled the log-out; another copy
// may still accept it for at most 30 seconds. Row Level Security in the
// database checks every read and change regardless.

// How long a check is remembered at most.
export const REMEMBER_MS = 30_000;

// A token is remembered under its fingerprint, never as itself.
export const tokenKey = (accessToken: string) => createHash('sha256').update(accessToken).digest('hex');

// When the token itself says it runs out ("exp", in milliseconds), or now
// when it cannot be read, so it is not remembered at all.
export const tokenExpiryMs = (accessToken: string) => {
  try {
    const payload = JSON.parse(Buffer.from(accessToken.split('.')[1] ?? '', 'base64url').toString()) as {
      exp?: unknown;
    };
    return typeof payload.exp === 'number' ? payload.exp * 1000 : Date.now();
  } catch {
    return Date.now();
  }
};

// Until when a check made now may be remembered: 30 seconds, never past
// the token's own expiry.
export const rememberUntil = (accessToken: string) =>
  Math.min(Date.now() + REMEMBER_MS, tokenExpiryMs(accessToken));

// A small remembered list that drops its oldest entry when full.
export class TokenMemory<T> {
  private readonly entries = new Map<string, { value: T; until: number }>();

  constructor(private readonly max: number) {}

  get(accessToken: string): T | undefined {
    const key = tokenKey(accessToken);
    const entry = this.entries.get(key);
    if (entry && entry.until > Date.now()) return entry.value;
    this.entries.delete(key);
    return undefined;
  }

  set(accessToken: string, value: T) {
    const until = rememberUntil(accessToken);
    if (until <= Date.now()) return;
    if (this.entries.size >= this.max) {
      const oldest = this.entries.keys().next().value;
      if (oldest !== undefined) this.entries.delete(oldest);
    }
    this.entries.set(tokenKey(accessToken), { value, until });
  }

  forget(accessToken: string) {
    this.entries.delete(tokenKey(accessToken));
  }
}
