import { BadRequestException, Body, Controller, Get, Header, Headers, HttpCode, Patch, Post } from '@nestjs/common';
import { loginToken } from '../login-token';
import { AuthService, SignUpRequest } from './auth.service';

const TRAVELER_TYPES = ['local', 'domestic', 'foreign'];
const MIN_PASSWORD_LENGTH = 8;

// Quick checks with friendly messages; Supabase checks everything again.
// Shared with POST /v1/admin/login (ticket 107).
export const emailAndPassword = (body: Record<string, unknown> | undefined) => {
  const email = typeof body?.email === 'string' ? body.email.trim() : '';
  const password = typeof body?.password === 'string' ? body.password : '';
  if (!email.includes('@')) {
    throw new BadRequestException({ statusCode: 400, code: 'email_address_invalid', message: 'Please enter a valid email address.' });
  }
  if (!password) {
    throw new BadRequestException({ statusCode: 400, code: 'validation_failed', message: 'Please enter your password.' });
  }
  return { email, password };
};

@Controller('v1/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  // POST /v1/auth/signup
  // body: { email, password, display_name, traveler_type }
  // Creates an account and answers { created: true, needs_confirmation }.
  // It does not log the traveler in: they log in themselves afterwards.
  @Post('signup')
  @HttpCode(200)
  signUp(@Body() body: Record<string, unknown> | undefined) {
    const { email, password } = emailAndPassword(body);
    const displayName = typeof body?.display_name === 'string' ? body.display_name.trim() : '';
    const travelerType = body?.traveler_type;
    if (displayName.length < 2 || displayName.length > 40) {
      throw new BadRequestException({ statusCode: 400, code: 'display_name_invalid', message: 'Your display name needs 2 to 40 characters.' });
    }

    if (typeof travelerType !== 'string' || !TRAVELER_TYPES.includes(travelerType)) {
      throw new BadRequestException({ statusCode: 400, code: 'traveler_type_invalid', message: "Please pick how you're traveling." });
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      throw new BadRequestException({ statusCode: 400, code: 'weak_password', message: `Use at least ${MIN_PASSWORD_LENGTH} characters.` });
    }
    return this.authService.signUp({
      email,
      password,
      display_name: displayName,
      traveler_type: travelerType as SignUpRequest['traveler_type'],
    });
  }

  // GET /v1/auth/me   (header: Authorization: Bearer <login token>)
  // "Who is logged in": answers { id, email, display_name, traveler_type }
  // for the traveler whose login token it is, and nobody else. "no-store"
  // stops browsers and proxies from keeping a copy of these personal
  // details.
  @Get('me')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  me(@Headers('authorization') authorization: string | undefined) {
    return this.authService.me(loginToken(authorization));
  }

  // PATCH /v1/auth/me   (header: Authorization: Bearer <login token>)
  // body: { display_name, traveler_type }
  // Changes the traveler's own display name (2 to 40 characters) and
  // traveler type, and answers like GET /v1/auth/me. The database copies
  // them onto all their reviews and replies (supabase/sql/030).
  @Patch('me')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  updateMe(
    @Headers('authorization') authorization: string | undefined,
    @Body() body: Record<string, unknown> | undefined,
  ) {
    const token = loginToken(authorization);
    const displayName = typeof body?.display_name === 'string' ? body.display_name.trim() : '';
    const travelerType = body?.traveler_type;
    if (displayName.length < 2 || displayName.length > 40) {
      throw new BadRequestException({ statusCode: 400, code: 'display_name_invalid', message: 'Your display name needs 2 to 40 characters.' });
    }
    if (typeof travelerType !== 'string' || !TRAVELER_TYPES.includes(travelerType)) {
      throw new BadRequestException({ statusCode: 400, code: 'traveler_type_invalid', message: "Please pick how you're traveling." });
    }
    return this.authService.updateMe(token, {
      display_name: displayName,
      traveler_type: travelerType as SignUpRequest['traveler_type'],
    });
  }

  // POST /v1/auth/logout   (header: Authorization: Bearer <login token>)
  // Ends the traveler's login on this device only and answers
  // { message: "You're logged out." }. 401 without a valid login.
  @Post('logout')
  @HttpCode(200)
  logOut(@Headers('authorization') authorization: string | undefined) {
    return this.authService.logOut(loginToken(authorization));
  }

  // POST /v1/auth/refresh
  // body: { refresh_token }
  // Renews the login before it runs out and answers { session }, the
  // renewed login. 401 "Your login has ended. Please log in again." when
  // the renewal code no longer works. "no-store": logins are never kept by
  // browsers or proxies.
  @Post('refresh')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  refresh(@Body() body: Record<string, unknown> | undefined) {
    const refreshToken = typeof body?.refresh_token === 'string' ? body.refresh_token.trim() : '';
    if (!refreshToken) {
      throw new BadRequestException({ statusCode: 400, code: 'validation_failed', message: 'Please send the login renewal code.' });
    }
    return this.authService.refresh(refreshToken);
  }

  // POST /v1/auth/login
  // body: { email, password }
  // Logs in and answers { session } (the login, for the browser to keep).
  @Post('login')
  @HttpCode(200)
  logIn(@Body() body: Record<string, unknown> | undefined) {
    const { email, password } = emailAndPassword(body);
    return this.authService.logIn(email, password);
  }
}
