import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { AccommodationsService } from './accommodations.service';

@Controller('v1/accommodations')
export class AccommodationsController {
  constructor(private readonly accommodationsService: AccommodationsService) {}

  // GET /v1/accommodations?type=hotel
  @Get()
  findAll(@Query('type') type?: string) {
    return this.accommodationsService.findAll(type);
  }

  // GET /v1/accommodations/:id — ParseUUIDPipe answers 400 for an id that
  // is not a UUID, before it reaches the database.
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.accommodationsService.findOne(id);
  }
}
