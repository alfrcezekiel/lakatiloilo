import { Controller, Get, HttpCode } from '@nestjs/common';
import { CategoriesService } from './categories.service';

@Controller('v1/categories')
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  // GET /v1/categories — anyone, no login. Every destination category and
  // accommodation kind: { id, name, applies_to }, A to Z. The home page
  // and the dashboard's place form use it (ticket 116).
  @Get()
  @HttpCode(200)
  list() {
    return this.categories.list();
  }
}