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
@Injectable()
export class SupabaseService {
  private anon: SupabaseClient | null = null;

  constructor(private readonly config: ConfigService) {}

  // Created on first use, so the places endpoints keep working even if
  // these settings are missing.
  // Only used to check login tokens, which keeps no login of its own, so
  // one shared client is safe here.
  private client(): SupabaseClient {
    this.anon ??= this.freshClient();
    return this.anon;
  }

  // A brand-new Supabase client for one sign-up or log-in. Each request
  // gets its own, so one traveler's login can never be mixed up with
  // another's inside the backend.
  freshClient(): SupabaseClient {
    const url = this.config.get<string>('SUPABASE_URL');
    const anonKey = this.config.get<string>('SUPABASE_ANON_KEY');
    if (!url || !anonKey) {
      throw new Error(
        'SUPABASE_URL or SUPABASE_ANON_KEY is not set. Add them to backend/.env (see .env.example) and to Vercel.',
      );
    }
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
    const url = this.config.get<string>('SUPABASE_URL');
    const anonKey = this.config.get<string>('SUPABASE_ANON_KEY');
    if (!url || !anonKey) {
      throw new Error(
        'SUPABASE_URL or SUPABASE_ANON_KEY is not set. Add them to backend/.env (see .env.example) and to Vercel.',
      );
    }
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
  async userFor(accessToken: string): Promise<User | null> {
    const { data, error } = await this.client().auth.getUser(accessToken);
    if (error || !data.user) return null;
    return data.user;
  }

  // The same, but only the account id (what the reviews need).
  async userIdFor(accessToken: string): Promise<string | null> {
    return (await this.userFor(accessToken))?.id ?? null;
  }
}
