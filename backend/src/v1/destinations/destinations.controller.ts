import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { DestinationsService } from './destinations.service';

@Controller('v1/destinations')
export class DestinationsController {
  constructor(private readonly destinationsService: DestinationsService) {}

  // GET /v1/destinations?category=mountain&location_type=iloilo_city
  @Get()
  findAll(
    @Query('category') category?: string,
    @Query('location_type') locationType?: string,
  ) {
    return this.destinationsService.findAll(category, locationType);
  }

  // GET /v1/destinations/:id — ParseUUIDPipe answers 400 for an id that
  // is not a UUID, before it reaches the database.
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.destinationsService.findOne(id);
  }
}
