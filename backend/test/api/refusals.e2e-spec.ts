import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from '../helpers/create-test-app';
import { TOKENS, UNKNOWN_ID, bearer } from '../fixtures/people';
import { TINY_PNG } from '../fixtures/photos';

// Anyone on the internet can call this API. These tests prove it says "no"
// to the wrong people, with the right code and a plain sentence, BEFORE
// anything reaches the database. Logins are pretend (fixtures/people.ts).

type Method = 'get' | 'post' | 'patch' | 'put' | 'delete';
const ID = UNKNOWN_ID; // a well-formed id, so only the login is being judged

// Every endpoint that needs a logged-in traveler (docs/SPEC.md).
const TRAVELER_ROUTES: [Method, string][] = [
  ['post', '/v1/reviews'],
  ['patch', `/v1/reviews/${ID}`],
  ['delete', `/v1/reviews/${ID}`],
  ['post', `/v1/reviews/${ID}/like`],
  ['delete', `/v1/reviews/${ID}/like`],
  ['post', `/v1/reviews/${ID}/photos`],
  ['delete', `/v1/reviews/${ID}/photos/${ID}`],
  ['post', `/v1/reviews/${ID}/video`],
  ['delete', `/v1/reviews/${ID}/video`],
  ['post', `/v1/reviews/${ID}/report`],
  ['post', `/v1/reviews/${ID}/replies`],
  ['patch', `/v1/replies/${ID}`],
  ['post', `/v1/replies/${ID}/like`],
  ['delete', `/v1/replies/${ID}/like`],
  ['delete', `/v1/replies/${ID}`],
  ['get', '/v1/auth/me'],
  ['patch', '/v1/auth/me'],
  ['get', '/v1/notifications'],
  ['post', '/v1/notifications/read'],
];

// Every admin endpoint except the admin sign-in (POST /v1/admin/login).
const ADMIN_ROUTES: [Method, string][] = [
  ['get', '/v1/admin/me'],
  ['get', '/v1/admin/overview'],
  ['get', '/v1/admin/reports'],
  ['get', '/v1/admin/reviews'],
  ['get', `/v1/admin/reviews/${ID}/replies`],
  ['post', `/v1/admin/replies/${ID}/hide`],
  ['post', `/v1/admin/replies/${ID}/show`],
  ['delete', `/v1/admin/replies/${ID}`],
  ['get', `/v1/admin/reviews/${ID}/likes`],
  ['get', `/v1/admin/replies/${ID}/likes`],
  ['delete', `/v1/admin/reviews/${ID}/likes/${ID}`],
  ['delete', `/v1/admin/replies/${ID}/likes/${ID}`],
  ['post', `/v1/admin/reviews/${ID}/keep`],
  ['post', `/v1/admin/reviews/${ID}/hide`],
  ['post', `/v1/admin/reviews/${ID}/show`],
  ['delete', `/v1/admin/reviews/${ID}`],
  ['get', '/v1/admin/places'],
  ['get', `/v1/admin/places/destination/${ID}`],
  ['patch', `/v1/admin/places/destination/${ID}`],
  ['put', `/v1/admin/places/destination/${ID}/credits`],
  ['post', '/v1/admin/places/destination'],
  ['delete', `/v1/admin/places/destination/${ID}`],
  ['post', `/v1/admin/places/destination/${ID}/photos`],
  ['put', `/v1/admin/places/destination/${ID}/photos/${ID}/credits`],
  ['patch', `/v1/admin/places/destination/${ID}/photos/${ID}`],
  ['delete', `/v1/admin/places/destination/${ID}/photos/${ID}`],
  ['post', `/v1/admin/places/destination/${ID}/photo`],
  ['get', '/v1/admin/categories'],
  ['post', '/v1/admin/categories'],
  ['patch', `/v1/admin/categories/${ID}`],
  ['delete', `/v1/admin/categories/${ID}`],
  ['get', '/v1/admin/trash'],
  ['post', `/v1/admin/trash/reviews/${ID}/restore`],
  ['post', `/v1/admin/trash/replies/${ID}/restore`],
  ['post', `/v1/admin/trash/places/destination/${ID}/restore`],
  ['delete', `/v1/admin/trash/reviews/${ID}`],
  ['delete', `/v1/admin/trash/replies/${ID}`],
  ['delete', `/v1/admin/trash/places/destination/${ID}`],
];

describe('Refusals (API)', () => {
  let app: INestApplication;
  let supabase: Awaited<ReturnType<typeof createTestApp>>['supabase'];
  const call = (method: Method, path: string) => request(app.getHttpServer())[method](path);

  beforeAll(async () => {
    ({ app, supabase } = await createTestApp());
  });
  afterAll(async () => app.close());

  describe('traveler endpoints', () => {
    it.each(TRAVELER_ROUTES)('%s %s without a login answers 401 "Please log in, then try again."', async (method, path) => {
      const res = await call(method, path).send({});

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Please log in, then try again.');
    });

    // A body each endpoint accepts, so only the login is being judged (some
    // endpoints check the body first, and a bad body rightly answers 400).
    const validBody = (path: string): object => {
      if (path.endsWith('/report')) return { reason: 'spam' };
      if (path === '/v1/auth/me') return { display_name: 'Juan dela Cruz', traveler_type: 'local' };
      return { place_type: 'destination', place_id: ID, rating: 5, comment: 'Ganda!' };
    };

    it.each(TRAVELER_ROUTES)('%s %s with a login Supabase refuses answers 401', async (method, path) => {
      const pending = call(method, path).set(bearer(TOKENS.refused));
      const res = path.endsWith('/photos')
        ? await pending.attach('photo', TINY_PNG, { filename: 'tigbauan.png', contentType: 'image/png' })
        : await pending.send(validBody(path));

      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/log in/i);
      expect(JSON.stringify(res.body)).not.toMatch(/at \w+ \(|stack/i);
    });
  });

  describe('admin endpoints', () => {
    it.each(ADMIN_ROUTES)('%s %s without a login answers 401', async (method, path) => {
      const res = await call(method, path);

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Please log in, then try again.');
    });

    it.each(ADMIN_ROUTES)('%s %s with a login Supabase refuses answers 401', async (method, path) => {
      const res = await call(method, path).set(bearer(TOKENS.refused));

      expect(res.status).toBe(401);
    });

    it.each(ADMIN_ROUTES)('%s %s as a traveler answers 403 "This page is for the Lakat Iloilo team."', async (method, path) => {
      const res = await call(method, path).set(bearer(TOKENS.traveler));

      expect(res.status).toBe(403);
      expect(res.body.message).toBe('This page is for the Lakat Iloilo team.');
    });

    it.each([
      ['get', '/v1/admin/me'],
      ['get', '/v1/admin/places'],
      ['get', '/v1/admin/trash'],
    ] as [Method, string][])('%s %s lets an admin past the gate', async (method, path) => {
      const res = await call(method, path).set(bearer(TOKENS.admin));

      expect([401, 403]).not.toContain(res.status);
    });

    it("asks the database's is_admin(), never trusting what the browser says", async () => {
      const res = await call('get', '/v1/admin/places')
        .set(bearer(TOKENS.traveler))
        .set('X-Is-Admin', 'true')
        .query({ is_admin: 'true', role: 'admin' });

      expect(res.status).toBe(403);
    });

    it('leaves the admin sign-in open (it is how an admin logs in)', async () => {
      const res = await call('post', '/v1/admin/login').send({});

      expect(res.status).not.toBe(401);
      expect(res.status).toBeLessThan(500);
    });
  });

  describe('badly formatted ids answer 404 before anything else happens', () => {
    it.each([
      ['patch', '/v1/reviews/abc', "We couldn't find that review."],
      ['delete', '/v1/reviews/abc', "We couldn't find that review."],
      ['post', '/v1/reviews/abc/like', "We couldn't find that review."],
      ['post', '/v1/reviews/abc/video', "We couldn't find that review."],
      ['delete', '/v1/reviews/abc/video', "We couldn't find that review."],
      ['post', '/v1/reviews/abc/replies', "We couldn't find that review."],
      ['patch', '/v1/replies/abc', "We couldn't find that reply."],
      ['delete', "/v1/replies/1' or '1'='1", "We couldn't find that reply."],
    ] as [Method, string, string][])('%s %s', async (method, path, sentence) => {
      const res = await call(method, path).set(bearer(TOKENS.traveler)).send({});

      expect(res.status).toBe(404);
      expect(res.body.message).toBe(sentence);
    });
  });

  describe('bad input answers 400 with a sentence the website can show', () => {
    const goodReview = { place_type: 'destination', place_id: ID, rating: 5, comment: 'Ang ganda sa Guimaras!' };

    it.each([
      ['no place', { ...goodReview, place_type: undefined, place_id: undefined }, 'Please choose a destination or accommodation to review.'],
      ['a kind of place that does not exist', { ...goodReview, place_type: 'beach' }, 'Please choose a destination or accommodation to review.'],
      ['a place id that is not an id', { ...goodReview, place_id: '1' }, 'Please choose a destination or accommodation to review.'],
      ['6 stars', { ...goodReview, rating: 6 }, 'Please pick 1 to 5 stars and write 1 to 500 characters.'],
      ['0 stars', { ...goodReview, rating: 0 }, 'Please pick 1 to 5 stars and write 1 to 500 characters.'],
      ['3.5 stars', { ...goodReview, rating: 3.5 }, 'Please pick 1 to 5 stars and write 1 to 500 characters.'],
      ['an empty comment', { ...goodReview, comment: '   ' }, 'Please pick 1 to 5 stars and write 1 to 500 characters.'],
      ['a 501-character comment', { ...goodReview, comment: 'ñ'.repeat(501) }, 'Please pick 1 to 5 stars and write 1 to 500 characters.'],
    ])('POST /v1/reviews with %s', async (_case, body, sentence) => {
      const res = await call('post', '/v1/reviews').set(bearer(TOKENS.traveler)).send(body);

      expect(res.status).toBe(400);
      expect(res.body.message).toBe(sentence);
    });

    it('refuses to attach a video from another traveler\'s folder (400, nothing looked up in Storage)', async () => {
      const someoneElse = '33333333-3333-4333-8333-333333333333/44444444-4444-4444-8444-444444444444.mp4';

      const res = await call('post', `/v1/reviews/${UNKNOWN_ID}/video`).set(bearer(TOKENS.traveler)).send({ path: someoneElse });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Please choose an MP4, MOV or WebM video up to 50 MB and 60 seconds.');
    });

    it('refuses a video path that is not one of ours (400)', async () => {
      const res = await call('post', `/v1/reviews/${UNKNOWN_ID}/video`).set(bearer(TOKENS.traveler)).send({ path: '../../etc/passwd' });

      expect(res.status).toBe(400);
    });

    it('checks the review before asking Supabase about the login (no wasted call)', async () => {
      supabase.userIdFor.mockClear();
      supabase.userFor.mockClear();

      await call('post', '/v1/reviews').set(bearer(TOKENS.traveler)).send({ ...goodReview, rating: 6 });

      expect(supabase.userIdFor).not.toHaveBeenCalled();
      expect(supabase.userFor).not.toHaveBeenCalled();
    });

    it.each([
      ['an empty reply', { comment: '' }, 'Please write 1 to 300 characters.'],
      ['only spaces', { comment: '    ' }, 'Please write 1 to 300 characters.'],
      ['a 301-character reply', { comment: 'á'.repeat(301) }, 'Please write 1 to 300 characters.'],
      ['a parent reply id that is not an id', { comment: 'Salamat!', parent_reply_id: 'abc' }, "That reply isn't under this review."],
    ])('POST /v1/reviews/:id/replies with %s', async (_case, body, sentence) => {
      const res = await call('post', `/v1/reviews/${ID}/replies`).set(bearer(TOKENS.traveler)).send(body);

      expect(res.status).toBe(400);
      expect(res.body.message).toBe(sentence);
    });
  });
});
