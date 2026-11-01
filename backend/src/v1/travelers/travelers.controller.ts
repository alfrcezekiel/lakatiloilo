import { Controller, Get, HttpCode, Param } from '@nestjs/common';
import { TravelersService, travelerNotFound } from './travelers.service';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Controller('v1/travelers')
export class TravelersController {
  constructor(private readonly travelersService: TravelersService) {}

  // GET /v1/travelers/<id> — anyone, no login. A traveler's public
  // profile: name, traveler type, how many reviews, and their reviews
  // newest first, each with its place's name and Helpful count. Never an
  // email. 404 "We couldn't find this traveler." for an unknown traveler,
  // one with no reviews, or an id that is not a valid id at all (the page
  // shows the same message for all three).
  @Get(':id')
  @HttpCode(200)
  profile(@Param('id') id: string) {
    if (!UUID.test(id)) throw travelerNotFound();
    return this.travelersService.profile(id);
  }
}
