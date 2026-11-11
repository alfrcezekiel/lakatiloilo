import { Module } from '@nestjs/common';
import { PhotoCreditsController } from './photo-credits.controller';
import { PhotoCreditsService } from './photo-credits.service';

// The public list of place photo credits (photo credits round, ticket
// 136). Saving them is on the dashboard, in AdminModule.
@Module({
  controllers: [PhotoCreditsController],
  providers: [PhotoCreditsService],
})
export class PhotoCreditsModule {}
