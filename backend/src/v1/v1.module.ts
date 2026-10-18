import { Module } from '@nestjs/common';
import { DestinationsModule } from './destinations/destinations.module';

@Module({
  imports: [DestinationsModule],
})
export class V1Module {}
