import { Controller, Get, HttpCode } from '@nestjs/common';
import { FaqsService } from './faqs.service';

// The home page's "Frequently asked questions" (FAQs round, ticket 170).
@Controller('v1/faqs')
export class FaqsController {
  constructor(private readonly faqs: FaqsService) {}

  // GET /v1/faqs — anyone, no login. The shown questions, by topic and in
  // order: [{ id, question, answer, topic }]. Hidden ones never.
  @Get()
  @HttpCode(200)
  list() {
    return this.faqs.listShown();
  }
}
