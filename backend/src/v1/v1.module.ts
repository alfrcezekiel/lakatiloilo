import { Module } from '@nestjs/common';
import { AccommodationsModule } from './accommodations/accommodations.module';
import { DestinationsModule } from './destinations/destinations.module';

@Module({
  imports: [DestinationsModule, AccommodationsModule],
})
export class V1Module {}
