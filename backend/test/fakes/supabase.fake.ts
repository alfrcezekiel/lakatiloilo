import { jest } from '@jest/globals';
import { ADMIN_ID, TOKENS, TRAVELER_ID } from '../fixtures/people';

// A pretend SupabaseService (src/supabase/supabase.service.ts). It never
// calls Supabase: it knows the two pretend tokens in fixtures/people.ts and
// refuses everything else, the way Supabase Auth refuses a bad login.
const pretendUsers: Record<string, { id: string; email: string }> = {
  [TOKENS.traveler]: { id: TRAVELER_ID, email: 'traveler@example.test' },
  [TOKENS.admin]: { id: ADMIN_ID, email: 'admin@example.test' },
};

const notInTests = (what: string) => () => {
  throw new Error(`${what} talks to the real Supabase project, so the API tests never call it.`);
};

export const fakeSupabase = () => ({
  userFor: jest.fn(async (token: string) => pretendUsers[token] ?? null),
  userIdFor: jest.fn(async (token: string) => pretendUsers[token]?.id ?? null),
  forgetLogin: jest.fn(),
  updateOwnDetails: jest.fn(async () => null),
  publicFileUrl: (bucket: string, path: string) => `https://storage.example.test/${bucket}/${path}`,
  freshClient: jest.fn(notInTests('freshClient (sign-up and log-in)')),
  travelerClient: jest.fn(notInTests('travelerClient (photo storage)')),
});
