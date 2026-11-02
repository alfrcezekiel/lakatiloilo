import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { REPORT_REASONS, type ReportReason } from '../../entities/review-report.entity';
import { loginToken } from '../login-token';
import { ReportsService } from './reports.service';

// The reason must be one of the four, and the note (optional) at most 300
// characters once trimmed; an empty note is saved as no note. Friendly
// messages here; the database checks again (026).
const reportBody = (
  body: { reason?: unknown; note?: unknown } | undefined,
): { reason: ReportReason; note: string | null } => {
  const reason = body?.reason;
  if (typeof reason !== 'string' || !REPORT_REASONS.includes(reason as ReportReason)) {
    throw new BadRequestException('Please choose a reason.');
  }
  const note = typeof body?.note === 'string' ? body.note.trim() : '';
  if (note.length > 300) {
    throw new BadRequestException('Please keep the note to 300 characters.');
  }
  return { reason: reason as ReportReason, note: note || null };
};

@Controller('v1')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  // POST /v1/reviews/<id>/report   (header: Authorization: Bearer <login token>)
  // body: { reason: "spam" | "offensive" | "not_about_place" | "other", note? }
  // Reports someone else's review. Answers 201 with
  // { message: "Thanks — the team will take a look." }. Refusals: 401 not
  // logged in, 404 no such review, 400 own review / unknown reason / note
  // too long, 409 "You've already reported this review."
  @Post('reviews/:id/report')
  @HttpCode(201)
  report(
    @Headers('authorization') authorization: string | undefined,
    @Param('id', ParseUUIDPipe) reviewId: string,
    @Body() body: { reason?: unknown; note?: unknown } | undefined,
  ) {
    const token = loginToken(authorization);
    const { reason, note } = reportBody(body);
    return this.reportsService.report(token, reviewId, reason, note);
  }
}
