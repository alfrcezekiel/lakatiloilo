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

describe('Log in and Create account: empty fields (API)', () => {
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

    it('a short password still gets the controller\'s own message', async () => {
      const res = await post('/v1/auth/signup', { ...FULL_SIGNUP, password: 'short' });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('weak_password');
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
