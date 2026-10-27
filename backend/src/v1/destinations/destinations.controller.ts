import { Controller, Get, Param, ParseUUIDPipe, Query, HttpCode } from '@nestjs/common';
import { parseNearParams } from '../near-query';
import { DestinationsService } from './destinations.service';

@Controller('v1/destinations')
export class DestinationsController {
  constructor(private readonly destinationsService: DestinationsService) {}

  // GET /v1/destinations?category=mountain&location_type=iloilo_city
  @Get()
  @HttpCode(200)
  findAll(
    @Query('category') category?: string,
    @Query('location_type') locationType?: string,
  ) {
    return this.destinationsService.findAll(category, locationType);
  }

  // GET /v1/destinations/near?lat=10.72&lng=122.56&radius_km=5&category=...
  // Must stay above @Get(':id'), or NestJS would read "near" as an id.
  @Get('near')
  @HttpCode(200)
  findNear(
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
    @Query('radius_km') radiusKm?: string,
    @Query('category') category?: string,
  ) {
    return this.destinationsService.findNear(parseNearParams(lat, lng, radiusKm), category);
  }

  // GET /v1/destinations/:id — ParseUUIDPipe answers 400 for an id that
  // is not a UUID, before it reaches the database.
  @Get(':id')
  @HttpCode(200)
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.destinationsService.findOne(id);
  }
}
