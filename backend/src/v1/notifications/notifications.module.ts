import { Module } from '@nestjs/common';
import { SupabaseModule } from '../../supabase/supabase.module';
import { TravelerTransactions } from '../traveler-transactions';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

// Notifications (thread care round). Everything runs as the logged-in
// traveler, so it needs Supabase Auth to check the login.
@Module({
  imports: [SupabaseModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, TravelerTransactions],
})
export class NotificationsModule {}
