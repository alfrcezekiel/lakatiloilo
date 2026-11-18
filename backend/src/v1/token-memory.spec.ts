import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { REMEMBER_MS, TokenMemory, rememberUntil, tokenExpiryMs, tokenKey } from './token-memory';

const NOW = new Date('2026-11-17T08:00:00Z').getTime();

// A pretend login token whose middle part says when it runs out. It is
// never sent anywhere: TokenMemory only reads its "exp".
const tokenExpiringIn = (ms: number) => {
  const payload = Buffer.from(JSON.stringify({ exp: (NOW + ms) / 1000 })).toString('base64url');
  return `header.${payload}.signature`;
};

describe('token-memory helpers', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(NOW);
  });
  afterEach(() => jest.useRealTimers());

  it('remembers a token under a fingerprint, never as itself', () => {
    const token = tokenExpiringIn(60_000);
    expect(tokenKey(token)).toMatch(/^[0-9a-f]{64}$/);
    expect(tokenKey(token)).not.toContain(token);
  });

  it('reads when the token runs out', () => {
    expect(tokenExpiryMs(tokenExpiringIn(60_000))).toBe(NOW + 60_000);
  });

  it('treats a token it cannot read as already run out', () => {
    expect(tokenExpiryMs('not-a-token')).toBe(NOW);
    expect(tokenExpiryMs('a.!!!.b')).toBe(NOW);
  });

  it('remembers for 30 seconds at most', () => {
    expect(rememberUntil(tokenExpiringIn(60 * 60_000))).toBe(NOW + REMEMBER_MS);
  });

  it("never remembers past the token's own expiry", () => {
    expect(rememberUntil(tokenExpiringIn(10_000))).toBe(NOW + 10_000);
  });
});

describe('TokenMemory', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(NOW);
  });
  afterEach(() => jest.useRealTimers());

  it('gives back what was remembered for a token', () => {
    const memory = new TokenMemory<boolean>(10);
    const token = tokenExpiringIn(60 * 60_000);

    memory.set(token, true);

    expect(memory.get(token)).toBe(true);
  });

  it('forgets after 30 seconds', () => {
    const memory = new TokenMemory<boolean>(10);
    const token = tokenExpiringIn(60 * 60_000);
    memory.set(token, true);

    jest.advanceTimersByTime(REMEMBER_MS + 1);

    expect(memory.get(token)).toBeUndefined();
  });

  it('forgets when the token runs out, even before 30 seconds', () => {
    const memory = new TokenMemory<boolean>(10);
    const token = tokenExpiringIn(5_000);
    memory.set(token, true);

    jest.advanceTimersByTime(5_001);

    expect(memory.get(token)).toBeUndefined();
  });

  it('does not remember a token that has already run out', () => {
    const memory = new TokenMemory<boolean>(10);
    const token = tokenExpiringIn(-1_000);

    memory.set(token, true);

    expect(memory.get(token)).toBeUndefined();
  });

  it('forgets a token straight away after logging out', () => {
    const memory = new TokenMemory<boolean>(10);
    const token = tokenExpiringIn(60 * 60_000);
    memory.set(token, true);

    memory.forget(token);

    expect(memory.get(token)).toBeUndefined();
  });

  it('drops the oldest entry when it is full', () => {
    const memory = new TokenMemory<string>(2);
    const [first, second, third] = [1, 2, 3].map((n) => tokenExpiringIn(60 * 60_000 + n));

    memory.set(first, 'first');
    memory.set(second, 'second');
    memory.set(third, 'third');

    expect(memory.get(first)).toBeUndefined();
    expect(memory.get(second)).toBe('second');
    expect(memory.get(third)).toBe('third');
  });
});
