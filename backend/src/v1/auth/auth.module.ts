import { type MiddlewareConsumer, Module, type NestModule, RequestMethod } from '@nestjs/common';
import { SupabaseModule } from '../../supabase/supabase.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AdminAccess } from '../admin-access';
import { TravelerTransactions } from '../traveler-transactions';
import { RequiredAuthFieldsMiddleware } from './required-auth-fields.middleware';

@Module({
  imports: [SupabaseModule],
  controllers: [AuthController],
  // AdminAccess answers is_admin in GET /v1/auth/me (ticket 107);
  // exported, with AuthService, for the admin endpoints.
  providers: [AuthService, AdminAccess, TravelerTransactions],
  exports: [AuthService, AdminAccess],
})
export class AuthModule implements NestModule {
  // Log in and Create account refuse empty fields before the controller
  // runs (team request 2026-11-28). Only these two routes: the admin
  // sign-in (POST /v1/admin/login) keeps its own checks.
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RequiredAuthFieldsMiddleware)
      .forRoutes(
        { path: 'v1/auth/login', method: RequestMethod.POST },
        { path: 'v1/auth/signup', method: RequestMethod.POST },
      );
  }
}
