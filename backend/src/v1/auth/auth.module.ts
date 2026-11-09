import { Module } from '@nestjs/common';
import { SupabaseModule } from '../../supabase/supabase.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AdminAccess } from '../admin-access';
import { TravelerTransactions } from '../traveler-transactions';

@Module({
  imports: [SupabaseModule],
  controllers: [AuthController],
  // AdminAccess answers is_admin in GET /v1/auth/me (ticket 107);
  // exported, with AuthService, for the admin endpoints.
  providers: [AuthService, AdminAccess, TravelerTransactions],
  exports: [AuthService, AdminAccess],
})
export class AuthModule {}
