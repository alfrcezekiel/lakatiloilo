import { createHash } from 'crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseClient, User, createClient } from '@supabase/supabase-js';

// The backend's connection to Supabase Auth (the login service): signing
// up, logging in (src/v1/auth) and checking a traveler's login token.
// Reviews themselves are read and written with TypeORM (src/v1/reviews).
//
// It uses the publishable (anon) key, the same key the website uses.
// Never put the service_role key or an sb_secret_ key here: they skip Row
// Level Security entirely.
//
// Settings (backend/.env on your computer, Environment Variables on Vercel):
//   SUPABASE_URL       - the project's address, e.g. https://xxxx.supabase.co
//   SUPABASE_ANON_KEY  - the publishable (anon) key
// How long a genuine login check is remembered, and for how many logins.
const LOGIN_CHECK_MS = 30_000;
const MAX_REMEMBERED = 1000;

// A login is remembered under a fingerprint of its token, never the token
// itself.
const tokenKey = (accessToken: string) => createHash('sha256').update(accessToken).digest('hex');

// When the token itself says it runs out (its "exp", in milliseconds), or
// now when it cannot be read: then it is not remembered at all.
const tokenExpiryMs = (accessToken: string) => {
  try {
    const payload = JSON.parse(Buffer.from(accessToken.split('.')[1] ?? '', 'base64url').toString()) as {
      exp?: unknown;
    };
    return typeof payload.exp === 'number' ? payload.exp * 1000 : Date.now();
  } catch {
    return Date.now();
  }
};

@Injectable()
export class SupabaseService {
  private anon: SupabaseClient | null = null;
  // Genuine login checks, remembered briefly (see userFor).
  private readonly checkedLogins = new Map<string, { user: User; until: number }>();

  constructor(private readonly config: ConfigService) {}

  // Created on first use, so the places endpoints keep working even if
  // these settings are missing.
  // Only used to check login tokens, which keeps no login of its own, so
  // one shared client is safe here.
  private client(): SupabaseClient {
    this.anon ??= this.freshClient();
    return this.anon;
  }

  // The project's address and publishable (anon) key, from backend/.env
  // or Vercel. Throws a plain message when either is missing.
  private settings(): { url: string; anonKey: string } {
    const url = this.config.get<string>('SUPABASE_URL');
    const anonKey = this.config.get<string>('SUPABASE_ANON_KEY');
    if (!url || !anonKey) {
      throw new Error(
        'SUPABASE_URL or SUPABASE_ANON_KEY is not set. Add them to backend/.env (see .env.example) and to Vercel.',
      );
    }
    return { url, anonKey };
  }

  // A brand-new Supabase client for one sign-up or log-in. Each request
  // gets its own, so one traveler's login can never be mixed up with
  // another's inside the backend.
  freshClient(): SupabaseClient {
    const { url, anonKey } = this.settings();
    // The backend keeps no login of its own between requests.
    return createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  // A brand-new client that acts AS this traveler: every request carries
  // their login token, so Supabase Storage's policies (supabase/sql/027)
  // decide what they may upload or delete, like Row Level Security does for
  // the tables (review extras round, ticket 81). One per request, so two
  // travelers' logins can never mix.
  travelerClient(accessToken: string): SupabaseClient {
    const { url, anonKey } = this.settings();
    return createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
    });
  }

  // The public address of a file in a public Storage bucket. Anyone can
  // open it (the review-photos bucket is public, see 027).
  publicFileUrl(bucket: string, path: string): string {
    const url = this.config.get<string>('SUPABASE_URL') ?? '';
    return `${url.replace(/\/$/, '')}/storage/v1/object/public/${bucket}/${path
      .split('/')
      .map(encodeURIComponent)
      .join('/')}`;
  }

  // Asks Supabase Auth whose login token this is. Answers with that
  // traveler's account, or null if the token is not genuine, has expired,
  // or belongs to a logged-out session.
  //
  // A genuine answer is remembered for 30 seconds (never past the token's
  // own expiry), so one page that makes several requests asks Supabase
  // once instead of every time. Each ask took 170–800 ms, and an admin
  // page asked up to 7 times (slow admin pages, team report 2026-11-09).
  // Refused tokens are never remembered. Logging out and changing your
  // details forget the token at once (forgetLogin). Row Level Security
  // still checks every read and change in the database.
  async userFor(accessToken: string): Promise<User | null> {
    const key = tokenKey(accessToken);
    const remembered = this.checkedLogins.get(key);
    if (remembered && remembered.until > Date.now()) return remembered.user;
    this.checkedLogins.delete(key);

    const { data, error } = await this.client().auth.getUser(accessToken);
    if (error || !data.user) return null;

    const until = Math.min(Date.now() + LOGIN_CHECK_MS, tokenExpiryMs(accessToken));
    if (until > Date.now()) {
      // Keep the list small: drop the oldest when it is full.
      if (this.checkedLogins.size >= MAX_REMEMBERED) {
        const oldest = this.checkedLogins.keys().next().value;
        if (oldest !== undefined) this.checkedLogins.delete(oldest);
      }
      this.checkedLogins.set(key, { user: data.user, until });
    }
    return data.user;
  }

  // Forgets a remembered login check (after logging out, or after the
  // account's details changed).
  forgetLogin(accessToken: string) {
    this.checkedLogins.delete(tokenKey(accessToken));
  }

  // Changes the details (user_metadata) on the traveler's own account,
  // for example their display name (profile & replies round, ticket 94).
  // Supabase's updateUser() needs a stored login, which the backend never
  // keeps, so this asks Supabase Auth's "update my account" address
  // directly with the traveler's own token and the publishable key.
  // Supabase merges `data` into the existing details. Answers the updated
  // account, or null when the token is not accepted.
  async updateOwnDetails(accessToken: string, data: Record<string, string>): Promise<User | null> {
    const { url, anonKey } = this.settings();
    const response = await fetch(`${url.replace(/\/$/, '')}/auth/v1/user`, {
      method: 'PUT',
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ data }),
    });
    if (response.status === 401 || response.status === 403) return null;
    if (!response.ok) throw new Error(`Supabase Auth answered ${response.status} to an account update`);
    return (await response.json()) as User;
  }

  // The same, but only the account id (what the reviews need).
  async userIdFor(accessToken: string): Promise<string | null> {
    return (await this.userFor(accessToken))?.id ?? null;
  }
}
