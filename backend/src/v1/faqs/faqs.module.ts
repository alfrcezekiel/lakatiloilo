import { Module } from '@nestjs/common';
import { SupabaseModule } from '../../supabase/supabase.module';
import { TravelerTransactions } from '../traveler-transactions';
import { FaqsController } from './faqs.controller';
import { FaqsService } from './faqs.service';

// The home page's frequently asked questions (FAQs round, tickets 168
// and 170): GET /v1/faqs here; the admin endpoints are in AdminModule
// (AdminFaqsController).
@Module({
  imports: [SupabaseModule],
  controllers: [FaqsController],
  providers: [FaqsService, TravelerTransactions],
  exports: [FaqsService],
})
export class FaqsModule {}
