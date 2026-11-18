import { describe, expect, it } from '@jest/globals';
import { BadRequestException } from '@nestjs/common';
import { parseNearParams } from './near-query';

// Iloilo City, as the website sends it (query values arrive as text).
const ILOILO = { lat: '10.72', lng: '122.56' };

describe('parseNearParams', () => {
  it('turns the text values into numbers', () => {
    expect(parseNearParams(ILOILO.lat, ILOILO.lng, '5')).toEqual({
      lat: 10.72,
      lng: 122.56,
      radiusKm: 5,
    });
  });

  it('accepts the edges: lat ±90, lng ±180 and a 200 km radius', () => {
    expect(() => parseNearParams('90', '180', '200')).not.toThrow();
    expect(() => parseNearParams('-90', '-180', '0.1')).not.toThrow();
  });

  it.each([
    ['missing', undefined],
    ['empty', ''],
    ['not a number', 'iloilo'],
    ['above 90', '90.1'],
    ['below -90', '-91'],
  ])('refuses a lat that is %s with 400', (_case, lat) => {
    expect(() => parseNearParams(lat, ILOILO.lng, '5')).toThrow(BadRequestException);
    expect(() => parseNearParams(lat, ILOILO.lng, '5')).toThrow('lat must be a number between -90 and 90');
  });

  it.each([
    ['missing', undefined],
    ['not a number', 'abc'],
    ['above 180', '181'],
  ])('refuses a lng that is %s with 400', (_case, lng) => {
    expect(() => parseNearParams(ILOILO.lat, lng, '5')).toThrow('lng must be a number between -180 and 180');
  });

  it.each([
    ['missing', undefined],
    ['zero', '0'],
    ['negative', '-5'],
    ['bigger than all of Iloilo (over 200 km)', '201'],
    ['not a number', 'far'],
  ])('refuses a radius that is %s with 400', (_case, radius) => {
    expect(() => parseNearParams(ILOILO.lat, ILOILO.lng, radius)).toThrow(
      'radius_km must be a number above 0 and at most 200',
    );
  });
});
