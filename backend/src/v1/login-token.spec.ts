import { describe, expect, it } from '@jest/globals';
import { UnauthorizedException } from '@nestjs/common';
import { loginToken } from './login-token';

describe('loginToken', () => {
  it('returns the token from "Authorization: Bearer <token>"', () => {
    expect(loginToken('Bearer abc.def.ghi')).toBe('abc.def.ghi');
  });

  it.each([
    ['no Authorization header', undefined],
    ['an empty header', ''],
    ['"Bearer" with nothing after it', 'Bearer '],
    ['another kind of login', 'Basic dXNlcjpwYXNz'],
    ['a lower-case "bearer"', 'bearer abc'],
  ])('refuses %s with 401 "Please log in, then try again."', (_case, header) => {
    expect(() => loginToken(header)).toThrow(UnauthorizedException);
    expect(() => loginToken(header)).toThrow('Please log in, then try again.');
  });
});
