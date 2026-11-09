import { Injectable } from '@nestjs/common';
import { AdminAccess, notForTravelers } from '../admin-access';
import { AuthService, type LoginResult, type Traveler } from '../auth/auth.service';

// The Lakat Iloilo team's own sign-in and "who is signed in" (admin
// dashboard & moderation round, ticket 107).
@Injectable()
export class AdminService {
  constructor(
    private readonly auth: AuthService,
    private readonly adminAccess: AdminAccess,
  ) {}

  // Logs in exactly like a traveler (a wrong email or password answers
  // the same way), then checks the admins table. Anyone who is not an
  // admin is logged out again at once, so the browser never gets a login
  // from this page, and gets 403.
  async logIn(email: string, password: string): Promise<LoginResult> {
    const login = await this.auth.logIn(email, password);
    const token = login.session?.access_token;
    if (!token) return login;
    if (await this.adminAccess.isAdmin(token)) return login;
    await this.auth.logOut(token).catch(() => undefined);
    throw notForTravelers();
  }

  // The signed-in admin's own details. Only admins get here
  // (AdminOnlyMiddleware); the check stays, in case this is ever called
  // from somewhere else.
  async me(accessToken: string): Promise<Traveler> {
    const me = await this.auth.me(accessToken);
    if (!me.is_admin) throw notForTravelers();
    return me;
  }
}
