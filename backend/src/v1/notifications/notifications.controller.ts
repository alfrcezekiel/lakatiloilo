import { BadRequestException, Body, Controller, Get, Headers, HttpCode, Post } from '@nestjs/common';
import { loginToken } from '../login-token';
import { NotificationsService } from './notifications.service';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// The notifications bell (thread care round, tickets 102 and 103).
@Controller('v1/notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  // GET /v1/notifications   (header: Authorization: Bearer <login token>)
  // The logged-in traveler's own 20 newest notifications, newest first,
  // and unread_count. 401 without a login.
  @Get()
  @HttpCode(200)
  list(@Headers('authorization') authorization: string | undefined) {
    return this.notificationsService.list(loginToken(authorization));
  }

  // POST /v1/notifications/read   (header: Authorization: Bearer <login token>)
  // body: { id } marks that notification read; {} (no id) marks them all.
  // Answers { unread_count }. 400 for an id that is not an id, 401 without
  // a login. Someone else's id changes nothing (Row Level Security).
  @Post('read')
  @HttpCode(200)
  markRead(
    @Headers('authorization') authorization: string | undefined,
    @Body() body: { id?: unknown } | undefined,
  ) {
    const token = loginToken(authorization);
    const id = body?.id;
    if (id !== undefined && id !== null && (typeof id !== 'string' || !UUID.test(id))) {
      throw new BadRequestException("We couldn't find that notification.");
    }
    return this.notificationsService.markRead(token, (id as string) ?? null);
  }
}
