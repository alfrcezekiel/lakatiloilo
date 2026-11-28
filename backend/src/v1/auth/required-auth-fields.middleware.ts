import { BadRequestException, Injectable, type NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

// The login page's "empty box" check, on the backend (team request
// 2026-11-28). NestJS runs this before POST /v1/auth/login and
// POST /v1/auth/signup (see AuthModule), and before the team's sign-in,
// POST /v1/admin/login (see AdminModule; same day), so a request with an empty field
// is refused here, before the controller or Supabase Auth sees it. Each
// empty field gets its own sentence and code, the same ones the website's
// log-in forms show (src/lib/login-fields.ts, LoginForm.tsx authErrors):
//   log in (traveler and admin):  email_required, password_required
//   create account:  display_name_required, email_required,
//                    new_password_required, traveler_type_required
// Only the first empty field is reported (one refusal per request). Fields
// that are filled in but wrong (an email without "@", a short password)
// are still checked by the controller, with its own messages.
// The password is only checked for being empty: it is never trimmed,
// logged or sent back.

type Rule = { field: string; code: string; message: string };

const LOGIN_RULES: Rule[] = [
  { field: 'email', code: 'email_required', message: 'Please enter your email address.' },
  { field: 'password', code: 'password_required', message: 'Please enter your password.' },
];

const SIGNUP_RULES: Rule[] = [
  { field: 'display_name', code: 'display_name_required', message: 'Please choose a username.' },
  { field: 'email', code: 'email_required', message: 'Please enter your email address.' },
  { field: 'password', code: 'new_password_required', message: 'Please create a password.' },
  { field: 'traveler_type', code: 'traveler_type_required', message: "Please pick how you're traveling." },
];

// Empty = missing, not text, or only spaces. A password of only spaces is
// not empty: it is the traveler's to choose, and Supabase judges it.
const isEmpty = (value: unknown, trim: boolean) =>
  typeof value !== 'string' || (trim ? value.trim() : value) === '';

export const firstEmptyField = (
  rules: Rule[],
  body: Record<string, unknown> | undefined,
): Rule | undefined =>
  rules.find((rule) => isEmpty(body?.[rule.field], rule.field !== 'password'));

@Injectable()
export class RequiredAuthFieldsMiddleware implements NestMiddleware {
  use(request: Request, _response: Response, next: NextFunction) {
    // Express's JSON reader has already run, so the body is an object (or
    // missing when nothing was sent).
    const body =
      request.body && typeof request.body === 'object' ? (request.body as Record<string, unknown>) : undefined;
    // originalUrl, not path: Express shortens path for mounted middleware.
    const address = request.originalUrl.split('?')[0].replace(/\/+$/, '');
    const rules = address.endsWith('/signup') ? SIGNUP_RULES : LOGIN_RULES;
    const empty = firstEmptyField(rules, body);
    if (empty) {
      throw new BadRequestException({ statusCode: 400, code: empty.code, message: empty.message });
    }
    next();
  }
}
