import { describe, expect, it } from '@jest/globals';
import { BadRequestException } from '@nestjs/common';
import { PLACE_LIMITS, placeChangesFrom } from './place-changes';

// A place the admin form could send, inside Iloilo. Pretend data only.
const body = (description: string) => ({
  name: 'Breakthrough Restaurant',
  description,
  address: 'Villa de Arevalo, Iloilo City',
  kind: 'food',
  location_type: 'iloilo_city',
  latitude: '10.6798',
  longitude: '122.5173',
});

describe('placeChangesFrom: description length (team request 2026-11-28)', () => {
  it('allows up to 3000 characters', () => {
    expect(PLACE_LIMITS.description).toBe(3000);
    expect(placeChangesFrom('destination', body('a'.repeat(3000))).description).toHaveLength(3000);
    expect(placeChangesFrom('accommodation', body('a'.repeat(3000))).description).toHaveLength(3000);
  });

  it('refuses 3001 characters with a plain sentence', () => {
    expect(() => placeChangesFrom('destination', body('a'.repeat(3001)))).toThrow(BadRequestException);
    expect(() => placeChangesFrom('destination', body('a'.repeat(3001)))).toThrow(
      'Please write a description of 1 to 3000 characters.',
    );
  });

  it('keeps the paragraphs and counts without the spaces at the ends', () => {
    const typed = `  ${'a'.repeat(1500)}\n\n${'b'.repeat(1498)}  `;
    expect(placeChangesFrom('destination', body(typed)).description).toBe(typed.trim());
  });
});
