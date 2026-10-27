import { HttpException, Injectable, Logger } from '@nestjs/common';
import type { AuthError, Session } from '@supabase/supabase-js';
import { SupabaseService } from '../../supabase/supabase.service';

// What a new traveler sends to create an account.
export interface SignUpRequest {
  email: string;
  password: string;
  display_name: string;
  traveler_type: 'local' | 'domestic' | 'foreign';
}

// What the website gets back after logging in: the login, for the
// browser to keep.
export interface LoginResult {
  session: Session | null;
}

// What the website gets back after signing up. The traveler is NOT
// logged in: they log in themselves afterwards. `needs_confirmation` is
// true when Supabase wants the email confirmed first.
export interface SignUpResult {
  created: true;
  needs_confirmation: boolean;
}

// Signs travelers up and logs them in through Supabase Auth (the login
// service, not the data API). The password is passed straight on to
// Supabase: the backend never stores it, logs it or sends it back.
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(private readonly supabase: SupabaseService) {}

  async signUp(request: SignUpRequest): Promise<SignUpResult> {
    const client = this.supabase.freshClient();
    const { data, error } = await client.auth.signUp({
      email: request.email,
      password: request.password,
      // Saved on the account: reviews show the display name (never the
      // email), and the database copies traveler_type onto each review.
      options: {
        data: {
          display_name: request.display_name,
          traveler_type: request.traveler_type,
        },
      },
    });
    if (error) throw this.toHttpError(error);
    // Supabase logs a new account in straight away. Creating an account
    // should not log anyone in, so end that login at once: the traveler
    // logs in with their new password on the log-in page.
    if (data.session) {
      const { error: logOutError } = await client.auth.signOut();
      if (logOutError) {
        this.logger.warn(`Could not end the sign-up login: ${logOutError.code ?? 'no code'}`);
      }
    }
    return { created: true, needs_confirmation: !data.session };
  }

  async logIn(email: string, password: string): Promise<LoginResult> {
    const { data, error } = await this.supabase
      .freshClient()
      .auth.signInWithPassword({ email, password });
    if (error) throw this.toHttpError(error);
    return { session: data.session };
  }

  // Passes Supabase's refusal on with its own code (for example
  // "invalid_credentials" or "user_already_exists"), so the website can
  // show its usual plain message for each one.
  private toHttpError(error: AuthError) {
    const status = error.status && error.status >= 400 && error.status < 600 ? error.status : 500;
    if (status >= 500) this.logger.error(`Supabase Auth error: ${error.code ?? 'no code'} (${status})`);
    return new HttpException(
      {
        statusCode: status,
        code: error.code ?? null,
        message: error.message,
      },
      status,
    );
  }
}
