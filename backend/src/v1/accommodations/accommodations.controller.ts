import { Controller, Get, Param, ParseUUIDPipe, Query, HttpCode } from '@nestjs/common';
import { parseNearParams } from '../near-query';
import { AccommodationsService } from './accommodations.service';

@Controller('v1/accommodations')
export class AccommodationsController {
  constructor(private readonly accommodationsService: AccommodationsService) {}

  // GET /v1/accommodations?type=hotel
  @Get()
  @HttpCode(200)
  findAll(@Query('type') type?: string) {
    return this.accommodationsService.findAll(type);
  }

  // GET /v1/accommodations/near?lat=10.72&lng=122.56&radius_km=5&type=...
  // Must stay above @Get(':id'), or NestJS would read "near" as an id.
  @Get('near')
  @HttpCode(200)
  findNear(
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
    @Query('radius_km') radiusKm?: string,
    @Query('type') type?: string,
  ) {
    return this.accommodationsService.findNear(parseNearParams(lat, lng, radiusKm), type);
  }

  // GET /v1/accommodations/:id — ParseUUIDPipe answers 400 for an id that
  // is not a UUID, before it reaches the database.
  @Get(':id')
  @HttpCode(200)
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.accommodationsService.findOne(id);
  }
}
