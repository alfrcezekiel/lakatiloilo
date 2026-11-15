import { Controller, Delete, Get, Header, Headers, HttpCode, Param, Post } from '@nestjs/common';
import { idOf } from '../id-param';
import { loginToken } from '../login-token';
import { placeType } from './place-changes';
import { AdminTrashService } from './admin-trash.service';

// The dashboard's Trash (admin extras round, tickets 147 to 149), moved
// out of AdminController in the code review of 2026-11-15 (it had grown
// past 550 lines). Admins only: AdminOnlyMiddleware runs first (this
// controller is in AdminModule's forRoutes), and every change runs as
// the admin, so the database decides too.
@Controller('v1/admin/trash')
export class AdminTrashController {
  constructor(private readonly trash: AdminTrashService) {}

  // GET /v1/admin/trash   (tickets 147 and 148)
  // What admins deleted (reviews, replies and places), newest first, each
  // with when, by whom and when it is deleted for good (30 days later).
  // What has waited longer is deleted for good first (ticket 149).
  @Get()
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  listTrash(@Headers('authorization') authorization: string | undefined) {
    return this.trash.list(loginToken(authorization));
  }

  // POST /v1/admin/trash/reviews/<id>/restore   (ticket 147)
  // Brings a review back as it was. 200 { id, message }; 404 when it is not
  // in the Trash; 409 when its writer has written a new review of the place.
  @Post('reviews/:id/restore')
  @HttpCode(200)
  restoreReview(
    @Headers('authorization') authorization: string | undefined,
    @Param('id', idOf('review')) id: string,
  ) {
    return this.trash.restoreReview(loginToken(authorization), id);
  }

  // POST /v1/admin/trash/replies/<id>/restore   (ticket 148)
  // Puts a reply back in its thread as it was. 200 { id, message }; 404
  // when it is not in the Trash; 409 while its review is in the Trash.
  @Post('replies/:id/restore')
  @HttpCode(200)
  restoreReply(
    @Headers('authorization') authorization: string | undefined,
    @Param('id', idOf('reply')) id: string,
  ) {
    return this.trash.restoreReply(loginToken(authorization), id);
  }

  // POST /v1/admin/trash/places/<destination|accommodation>/<id>/restore
  // (ticket 148). Brings a place back with the reviews that went with it.
  // 200 { id, message }; 404 when it is not in the Trash.
  @Post('places/:type/:id/restore')
  @HttpCode(200)
  restorePlace(
    @Headers('authorization') authorization: string | undefined,
    @Param('type') type: string,
    @Param('id', idOf('place')) id: string,
  ) {
    return this.trash.restorePlace(loginToken(authorization), placeType(type), id);
  }

  // DELETE /v1/admin/trash/reviews/<id>, /trash/replies/<id> and
  // /trash/places/<destination|accommodation>/<id>   (ticket 149)
  // Delete for good, for an item in the Trash only, with its photo files.
  // A review takes its replies, likes, reports and photos; a reply with
  // answers stays as "This reply was deleted"; a place takes all its
  // reviews and photos. 200 { id, message }; 404 when it is not in the
  // Trash.
  @Delete('reviews/:id')
  @HttpCode(200)
  deleteReviewForGood(
    @Headers('authorization') authorization: string | undefined,
    @Param('id', idOf('review')) id: string,
  ) {
    return this.trash.deleteForGood(loginToken(authorization), 'review', id);
  }

  @Delete('replies/:id')
  @HttpCode(200)
  deleteReplyForGood(
    @Headers('authorization') authorization: string | undefined,
    @Param('id', idOf('reply')) id: string,
  ) {
    return this.trash.deleteForGood(loginToken(authorization), 'reply', id);
  }

  @Delete('places/:type/:id')
  @HttpCode(200)
  deletePlaceForGood(
    @Headers('authorization') authorization: string | undefined,
    @Param('type') type: string,
    @Param('id', idOf('place')) id: string,
  ) {
    return this.trash.deleteForGood(loginToken(authorization), 'place', id, placeType(type));
  }
}
