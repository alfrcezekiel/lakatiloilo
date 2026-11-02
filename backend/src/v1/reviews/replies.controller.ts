import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Headers,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { loginToken } from '../login-token';
import { RepliesService } from './replies.service';

// A reply's text: 1 to 300 characters once trimmed. A friendly message
// here; the database checks it again (025).
const replyText = (body: { comment?: unknown } | undefined): string => {
  const comment = typeof body?.comment === 'string' ? body.comment.trim() : '';
  if (comment.length < 1 || comment.length > 300) {
    throw new BadRequestException('Please write 1 to 300 characters.');
  }
  return comment;
};

// Replies under reviews (review extras round, ticket 79).
@Controller('v1')
export class RepliesController {
  constructor(private readonly repliesService: RepliesService) {}

  // POST /v1/reviews/<id>/replies   (header: Authorization: Bearer <login token>)
  // body: { comment }
  // Adds the logged-in traveler's reply and answers 201 with it. Refusals:
  // 401 not logged in, 404 no such review, 400 text outside 1–300 characters.
  @Post('reviews/:id/replies')
  @HttpCode(201)
  create(
    @Headers('authorization') authorization: string | undefined,
    @Param('id', ParseUUIDPipe) reviewId: string,
    @Body() body: { comment?: unknown } | undefined,
  ) {
    return this.repliesService.create(loginToken(authorization), reviewId, replyText(body));
  }

  // DELETE /v1/replies/<id>   (header: Authorization: Bearer <login token>)
  // Deletes the traveler's own reply. Answers 200 with
  // { id, message: "Your reply has been deleted." }; 404 "We couldn't find
  // that reply among yours." for someone else's reply.
  @Delete('replies/:id')
  @HttpCode(200)
  remove(
    @Headers('authorization') authorization: string | undefined,
    @Param('id', ParseUUIDPipe) replyId: string,
  ) {
    return this.repliesService.remove(loginToken(authorization), replyId);
  }
}
