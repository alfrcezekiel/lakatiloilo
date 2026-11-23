import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { ALLOWED_ORIGIN, createTestApp } from '../helpers/create-test-app';
import { UNKNOWN_ID } from '../fixtures/people';

// Reads anyone may make without a login, plus what every answer carries.
// The pretend database is empty, so lists come back empty.

describe('Public reads, headers and CORS (API)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    ({ app } = await createTestApp());
  });
  afterAll(async () => app.close());

  describe('security headers on every answer', () => {
    it.each(['/', '/v1/destinations', '/v1/nowhere'])(
      '%s carries nosniff, DENY and a policy that allows nothing, and no X-Powered-By',
      async (path) => {
        const res = await request(app.getHttpServer()).get(path);

        expect(res.headers['x-content-type-options']).toBe('nosniff');
        expect(res.headers['x-frame-options']).toBe('DENY');
        expect(res.headers['content-security-policy']).toBe(
          "default-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
        );
        expect(res.headers['x-powered-by']).toBeUndefined();
      },
    );
  });

  describe('CORS', () => {
    it("lets the team's own website call the API", async () => {
      const res = await request(app.getHttpServer())
        .options('/v1/reviews')
        .set('Origin', ALLOWED_ORIGIN)
        .set('Access-Control-Request-Method', 'POST');

      expect(res.headers['access-control-allow-origin']).toBe(ALLOWED_ORIGIN);
      expect(res.headers['access-control-allow-methods']).toBe('GET,POST,PUT,PATCH,DELETE');
    });

    it('does not let another website call the API', async () => {
      const res = await request(app.getHttpServer())
        .options('/v1/reviews')
        .set('Origin', 'https://evil.example')
        .set('Access-Control-Request-Method', 'POST');

      expect(res.headers['access-control-allow-origin']).toBeUndefined();
    });

    it('lets no website call the API from a browser when CORS_ORIGINS is blank (since ticket 152)', async () => {
      const { app: noCorsApp } = await createTestApp({ origins: [] });

      const res = await request(noCorsApp.getHttpServer())
        .options('/v1/reviews')
        .set('Origin', ALLOWED_ORIGIN)
        .set('Access-Control-Request-Method', 'POST');
      await noCorsApp.close();

      expect(res.headers['access-control-allow-origin']).toBeUndefined();
    });
  });

  describe('lists anyone may read', () => {
    it.each([
      '/v1/destinations',
      '/v1/accommodations',
      '/v1/ratings',
      '/v1/categories',
      '/v1/destinations/near?lat=10.72&lng=122.56&radius_km=5',
      '/v1/accommodations/near?lat=10.72&lng=122.56&radius_km=5',
      `/v1/reviews?place_type=destination&place_id=${UNKNOWN_ID}`,
    ])('GET %s answers 200 with JSON', async (path) => {
      const res = await request(app.getHttpServer()).get(path);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/application\/json/);
    });
  });

  describe('questions that make no sense answer 400 with a plain sentence', () => {
    it.each([
      ['/v1/reviews', 'Please choose a destination or accommodation.'],
      ['/v1/reviews?place_type=destination&place_id=abc', 'Please choose a destination or accommodation.'],
      ['/v1/destinations/near?lng=122.56&radius_km=5', 'lat must be a number between -90 and 90'],
      ['/v1/accommodations/near?lat=10.72&lng=122.56&radius_km=500', 'radius_km must be a number above 0 and at most 200'],
    ])('GET %s', async (path, sentence) => {
      const res = await request(app.getHttpServer()).get(path);

      expect(res.status).toBe(400);
      expect(res.body.message).toBe(sentence);
    });
  });

  describe('things that do not exist answer 404 with a plain sentence', () => {
    it.each([
      ['/v1/destinations/abc', "We couldn't find that destination."],
      [`/v1/destinations/${UNKNOWN_ID}`, "We couldn't find that destination."],
      ['/v1/accommodations/abc', "We couldn't find that accommodation."],
      [`/v1/accommodations/${UNKNOWN_ID}`, "We couldn't find that accommodation."],
      [`/v1/travelers/${UNKNOWN_ID}`, "We couldn't find this traveler."],
      ['/v1/nowhere', "We couldn't find that address."],
    ])('GET %s', async (path, sentence) => {
      const res = await request(app.getHttpServer()).get(path);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe(sentence);
    });
  });

  it('never answers with a stack trace or SQL', async () => {
    const res = await request(app.getHttpServer()).get(`/v1/destinations/${UNKNOWN_ID}`);
    expect(JSON.stringify(res.body)).not.toMatch(/at \w+ \(|select |QueryFailedError/i);
  });
});
