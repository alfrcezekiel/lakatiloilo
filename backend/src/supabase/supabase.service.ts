import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseClient, createClient } from '@supabase/supabase-js';

// The backend's connection to Supabase for reviews (and, later, log-in).
//
// It uses the publishable (anon) key, the same key the website uses, so
// Row Level Security on the reviews table still decides who may read or
// change what. Never put the service_role key or an sb_secret_ key here:
// they skip Row Level Security entirely.
//
// Settings (backend/.env on your computer, Environment Variables on Vercel):
//   SUPABASE_URL       - the project's address, e.g. https://xxxx.supabase.co
//   SUPABASE_ANON_KEY  - the publishable (anon) key
@Injectable()
export class SupabaseService {
  private anon: SupabaseClient | null = null;

  constructor(private readonly config: ConfigService) {}

  // A Supabase client with no traveler logged in. Created on first use, so
  // the places endpoints keep working even if these settings are missing.
  anonClient(): SupabaseClient {
    if (!this.anon) {
      const url = this.config.get<string>('SUPABASE_URL');
      const anonKey = this.config.get<string>('SUPABASE_ANON_KEY');
      if (!url || !anonKey) {
        throw new Error(
          'SUPABASE_URL or SUPABASE_ANON_KEY is not set. Add them to backend/.env (see .env.example) and to Vercel.',
        );
      }
      // The backend keeps no login of its own between requests.
      this.anon = createClient(url, anonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
    }
    return this.anon;
  }
}
