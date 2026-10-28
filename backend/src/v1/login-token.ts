import { UnauthorizedException } from '@nestjs/common';

// The traveler's login token, from "Authorization: Bearer <token>".
// Shared by every endpoint that needs a logged-in traveler (reviews and
// "who is logged in"). Without one, the answer is 401 with a plain message.
export const loginToken = (authorization?: string) => {
  const token = authorization?.match(/^Bearer (.+)$/)?.[1];
  if (!token) throw new UnauthorizedException('Please log in, then try again.');
  return token;
};
