import { Injectable, type NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { AdminAccess } from '../admin-access';
import { loginToken } from '../login-token';

// The admin endpoints' gate (admin dashboard & moderation round, ticket
// 107, team request 2026-11-08). NestJS runs this before every
// /v1/admin/... endpoint except the sign-in (see AdminModule), so a new
// admin endpoint is protected without having to remember to check:
//   - no login:          401 "Please log in, then try again."
//   - a refused login:   401 (Supabase Auth says it is not valid)
//   - not an admin:      403 "This page is for the Lakat Iloilo team."
// Whether someone is an admin comes from the database's own is_admin()
// (the admins table), asked as that person, never from anything the
// browser sends. The endpoints then run as the admin, so Row Level
// Security checks every change again.
@Injectable()
export class AdminOnlyMiddleware implements NestMiddleware {
  constructor(private readonly adminAccess: AdminAccess) {}

  async use(request: Request, _response: Response, next: NextFunction) {
    await this.adminAccess.requireAdmin(loginToken(request.headers.authorization));
    next();
  }
}
