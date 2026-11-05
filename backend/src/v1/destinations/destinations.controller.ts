import { Controller, Get, Param, Query, HttpCode } from '@nestjs/common';
import { parseNearParams } from '../near-query';
import { DestinationsService } from './destinations.service';
import { idOf } from '../id-param';

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

  // GET /v1/destinations/:id — a badly formatted id answers 404
  // "We couldn't find that …" before it reaches the database (id-param.ts).
  @Get(':id')
  @HttpCode(200)
  findOne(@Param('id', idOf('destination')) id: string) {
    return this.destinationsService.findOne(id);
  }
}
