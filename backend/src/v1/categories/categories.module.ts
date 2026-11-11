import { Module } from '@nestjs/common';
import { SupabaseModule } from '../../supabase/supabase.module';
import { TravelerTransactions } from '../traveler-transactions';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';

// Destination categories and accommodation kinds (full admin management
// round, ticket 116). Anyone may read the list here; the admin endpoints
// that add and delete are in AdminModule (AdminCategoriesController).
@Module({
  imports: [SupabaseModule],
  controllers: [CategoriesController],
  providers: [CategoriesService, TravelerTransactions],
  exports: [CategoriesService],
})
export class CategoriesModule {}
