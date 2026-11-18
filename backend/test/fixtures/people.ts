// The pretend people the API tests use. None of these exist in the hosted
// Supabase project, and these "tokens" are plain words, not real logins.

export const TRAVELER_ID = '11111111-1111-4111-8111-111111111111';
export const ADMIN_ID = '22222222-2222-4222-8222-222222222222';

export const TOKENS = {
  traveler: 'pretend-traveler-token',
  admin: 'pretend-admin-token',
  // A login Supabase does not accept (expired, made up, or tampered with).
  refused: 'fake',
} as const;

export const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

// A well-formed id that belongs to nothing in the pretend database.
export const UNKNOWN_ID = '99999999-9999-4999-8999-999999999999';
