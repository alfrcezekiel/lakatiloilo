import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from '../helpers/create-test-app';

// RequiredAuthFieldsMiddleware (team request 2026-11-28): Log in and
// Create account refuse an empty field with its own code and sentence,
// before the controller or (pretend) Supabase Auth is asked.

const FULL_SIGNUP = {
  display_name: 'Juan',
  email: 'juan@example.com',
  password: 'pretend-password-1',
  traveler_type: 'local',
};

describe('Log in, Create account and team sign-in: empty fields (API)', () => {
  let app: INestApplication;
  let supabase: Awaited<ReturnType<typeof createTestApp>>['supabase'];
  const post = (path: string, body?: object) => {
    const pending = request(app.getHttpServer()).post(path);
    return body === undefined ? pending : pending.send(body);
  };

  beforeAll(async () => {
    ({ app, supabase } = await createTestApp());
  });
  afterAll(async () => app.close());

  describe('POST /v1/auth/login', () => {
    it.each([
      ['no body at all', undefined, 'email_required', 'Please enter your email address.'],
      ['both empty', { email: '', password: '' }, 'email_required', 'Please enter your email address.'],
      ['email only spaces', { email: '   ', password: 'x' }, 'email_required', 'Please enter your email address.'],
      ['password empty', { email: 'juan@example.com', password: '' }, 'password_required', 'Please enter your password.'],
      ['password missing', { email: 'juan@example.com' }, 'password_required', 'Please enter your password.'],
    ])('%s answers 400 with its own message', async (_name, body, code, message) => {
      const res = await post('/v1/auth/login', body);

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ statusCode: 400, code, message });
    });

    it('an email without "@" still gets the controller\'s own message', async () => {
      const res = await post('/v1/auth/login', { email: 'juan', password: 'x' });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('email_address_invalid');
    });

    it('never sends the password back', async () => {
      const res = await post('/v1/auth/login', { email: '', password: 'secret-pretend' });

      expect(JSON.stringify(res.body)).not.toContain('secret-pretend');
    });
  });

  describe('POST /v1/auth/signup', () => {
    it.each([
      ['display_name', '', 'display_name_required', 'Please choose a username.'],
      ['email', '', 'email_required', 'Please enter your email address.'],
      ['password', '', 'new_password_required', 'Please create a password.'],
      ['traveler_type', '', 'traveler_type_required', "Please pick how you're traveling."],
    ])('empty %s answers 400 with its own message', async (field, value, code, message) => {
      const res = await post('/v1/auth/signup', { ...FULL_SIGNUP, [field]: value });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ statusCode: 400, code, message });
    });

    it('everything empty reports the first box, the username', async () => {
      const res = await post('/v1/auth/signup', {});

      expect(res.body.code).toBe('display_name_required');
    });

    it.each([['one letter', 'J'], ['41 letters', 'J'.repeat(41)]])(
      'a username of %s says "username", like the box',
      async (_name, displayName) => {
        const res = await post('/v1/auth/signup', { ...FULL_SIGNUP, display_name: displayName });

        expect(res.status).toBe(400);
        expect(res.body).toEqual({
          statusCode: 400,
          code: 'display_name_invalid',
          message: 'Your username needs 2 to 40 characters.',
        });
      },
    );

    it('a short password still gets the controller\'s own message', async () => {
      const res = await post('/v1/auth/signup', { ...FULL_SIGNUP, password: 'short' });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('weak_password');
    });
  });

  // The team's sign-in, same middleware (team request 2026-11-28).
  describe('POST /v1/admin/login', () => {
    it.each([
      ['no body at all', undefined, 'email_required', 'Please enter your email address.'],
      ['both empty', { email: '', password: '' }, 'email_required', 'Please enter your email address.'],
      ['password empty', { email: 'team@example.com', password: '' }, 'password_required', 'Please enter your password.'],
    ])('%s answers 400 with the traveler log-in\'s message', async (_name, body, code, message) => {
      const res = await post('/v1/admin/login', body);

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ statusCode: 400, code, message });
    });

    it('an email without "@" gets the same message as the traveler log-in', async () => {
      const res = await post('/v1/admin/login', { email: 'team', password: 'x' });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('email_address_invalid');
      expect(res.body.message).toBe('Please enter a valid email address.');
    });
  });

  // Last, after every test above: none of the refusals asked (pretend)
  // Supabase Auth.
  describe('afterwards', () => {
    it('the refusals never reached Supabase Auth', () => {
      expect(supabase.freshClient).not.toHaveBeenCalled();
    });
  });
});
