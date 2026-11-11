import { Controller, Get, HttpCode } from '@nestjs/common';
import { PhotoCreditsService } from './photo-credits.service';

@Controller('v1/photo-credits')
export class PhotoCreditsController {
  constructor(private readonly photoCredits: PhotoCreditsService) {}

  // GET /v1/photo-credits — anyone, no login. Every place photo credit
  // saved on the dashboard: { place_type, place_id, place_name,
  // credit_line, licence, source_url }, by place name (ticket 136). The
  // Photo credits page lists them.
  @Get()
  @HttpCode(200)
  list() {
    return this.photoCredits.list();
  }
}
