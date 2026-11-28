import { Body, Controller, Delete, Get, Header, Headers, HttpCode, Param, Patch, Post } from '@nestjs/common';
import { idOf } from '../id-param';
import { loginToken } from '../login-token';
import { FaqsService, faqChangesFrom, moveDirectionFrom } from '../faqs/faqs.service';

// The dashboard's FAQs screen (FAQs round, tickets 168, 169 and 172). Admins
// only: AdminOnlyMiddleware runs first (see AdminModule), and the work
// runs as the admin, so the database decides too.
//
// A refusal for one box of the form answers
// { statusCode, field, code, message }, so the website can put the
// message under that box: field is "question", "answer", "topic" or
// "is_shown".
@Controller('v1/admin/faqs')
export class AdminFaqsController {
  constructor(private readonly faqs: FaqsService) {}

  // GET /v1/admin/faqs
  // Every question, shown and hidden, by topic and in order:
  // [{ id, question, answer, topic, position, is_shown, updated_at }].
  @Get()
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  list(@Headers('authorization') authorization: string | undefined) {
    return this.faqs.listForAdmin(loginToken(authorization));
  }

  // POST /v1/admin/faqs   (ticket 169)
  // body: { question, answer, topic, is_shown? }. Adds it at the end of its
  // topic and answers with it. 400 for an empty or too-long box or a wrong
  // topic; 409 "Only 12 questions can show at once. Hide one first."
  @Post()
  @HttpCode(201)
  add(
    @Headers('authorization') authorization: string | undefined,
    @Body() body: Record<string, unknown> | undefined,
  ) {
    return this.faqs.add(loginToken(authorization), faqChangesFrom(body, true));
  }

  // PATCH /v1/admin/faqs/<id>   (ticket 169)
  // body: any of { question, answer, topic, is_shown }. Answers with the
  // saved question; the same 400 and 409 answers; 404 for an unknown one.
  @Patch(':id')
  @HttpCode(200)
  update(
    @Headers('authorization') authorization: string | undefined,
    @Param('id', idOf('question')) id: string,
    @Body() body: Record<string, unknown> | undefined,
  ) {
    return this.faqs.update(loginToken(authorization), id, faqChangesFrom(body, false));
  }

  // POST /v1/admin/faqs/<id>/move   (ticket 172)
  // body: { direction: "up" | "down" }. Swaps it with its neighbour in its
  // topic and answers with every question in the new order (as GET).
  // 400 at the first or last, or for another direction; 404 unknown.
  @Post(':id/move')
  @HttpCode(200)
  move(
    @Headers('authorization') authorization: string | undefined,
    @Param('id', idOf('question')) id: string,
    @Body() body: Record<string, unknown> | undefined,
  ) {
    return this.faqs.move(loginToken(authorization), id, moveDirectionFrom(body));
  }

  // DELETE /v1/admin/faqs/<id>   (ticket 172)
  // Deletes it for good (not to the Trash): 200 { id, message: "The
  // question has been deleted." }; 404 for an unknown one.
  @Delete(':id')
  @HttpCode(200)
  remove(@Headers('authorization') authorization: string | undefined, @Param('id', idOf('question')) id: string) {
    return this.faqs.remove(loginToken(authorization), id);
  }
}
