import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Headers,
  HttpCode,
  NotFoundException,
  Param,
  Patch,
  Put,
  Post,
  Query,
  UploadedFile,
  UseFilters,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { PhotoTooLargeFilter } from '../reviews/photo-too-large.filter';
import { PHOTO_MESSAGE, type UploadedPhoto } from '../reviews/review-photos.service';
import { idOf } from '../id-param';
import { loginToken } from '../login-token';
import { emailAndPassword } from '../auth/auth.controller';
import { AdminOverviewService } from './admin-overview.service';
import { AdminPhotoCreditsService } from './admin-photo-credits.service';
import { photoCreditsFrom } from './photo-credits';
import { AdminPlacesService } from './admin-places.service';
import { ADMIN_PLACE_TYPES, placeChangesFrom, type AdminPlaceType } from './place-changes';
import { AdminReportsService } from './admin-reports.service';
import { AdminReviewsService, reviewQueryFrom } from './admin-reviews.service';
import { AdminService } from './admin.service';

// The admin dashboard's endpoints (admin dashboard & moderation round).
// Every one except the sign-in is for admins only: 401 without a login,
// 403 "This page is for the Lakat Iloilo team." for anyone else.
// "destination" or "accommodation" in the address; anything else is not a
// place, so 404 like an unknown id.
const placeType = (type: string): AdminPlaceType => {
  if (!ADMIN_PLACE_TYPES.includes(type as AdminPlaceType)) {
    throw new NotFoundException("We couldn't find that place.");
  }
  return type as AdminPlaceType;
};

@Controller('v1/admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly adminReports: AdminReportsService,
    private readonly adminOverview: AdminOverviewService,
    private readonly adminPlaces: AdminPlacesService,
    private readonly adminReviews: AdminReviewsService,
    private readonly photoCredits: AdminPhotoCreditsService,
  ) {}

  // POST /v1/admin/login
  // body: { email, password }
  // An admin gets { session }, like POST /v1/auth/login. A wrong email or
  // password answers the same way as there; anyone else gets 403 and is
  // logged out again. "no-store": logins are never kept by caches.
  @Post('login')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  logIn(@Body() body: Record<string, unknown> | undefined) {
    const { email, password } = emailAndPassword(body);
    return this.adminService.logIn(email, password);
  }

  // GET /v1/admin/me   (header: Authorization: Bearer <login token>)
  // The signed-in admin's own details, the same as GET /v1/auth/me.
  @Get('me')
  @HttpCode(200)
  me(@Headers('authorization') authorization: string | undefined) {
    return this.adminService.me(loginToken(authorization));
  }

  // GET /v1/admin/overview   (header: Authorization: Bearer <login token>)
  // The dashboard home (ticket 111): reviews in the last 7 days, reports
  // waiting (and on how many reviews), hidden reviews, places listed, and
  // the 5 newest reports. Never who reported.
  @Get('overview')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  overview(@Headers('authorization') authorization: string | undefined) {
    return this.adminOverview.overview(loginToken(authorization));
  }

  // GET /v1/admin/reports   (header: Authorization: Bearer <login token>)
  // Every reported review, most reports first, with each report's reason
  // and note (ticket 108). Never who reported it.
  @Get('reports')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  reports(@Headers('authorization') authorization: string | undefined) {
    return this.adminReports.list(loginToken(authorization));
  }

  // GET /v1/admin/reviews?q=&show=all|hidden|reported&sort=recent|relevant|top
  //                        &per_page=10|25|50&page=1   (tickets 122, 130)
  // Every review, hidden ones too, one numbered page:
  // { reviews, total, page, per_page }. q searches the review text, the
  // reviewer's name and the place's name. 400 with a plain sentence for a
  // wrong filter, sort, number per page or page, or a too long search.
  @Get('reviews')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  reviews(
    @Headers('authorization') authorization: string | undefined,
    @Query() query: Record<string, unknown>,
  ) {
    const token = loginToken(authorization);
    return this.adminReviews.list(token, reviewQueryFrom(query));
  }

  // GET /v1/admin/reviews/<id>/replies   (ticket 124)
  // The review's replies, oldest first, with "This reply was deleted" ones
  // (no writer, name or text). 404 when the review no longer exists.
  @Get('reviews/:id/replies')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  reviewReplies(
    @Headers('authorization') authorization: string | undefined,
    @Param('id', idOf('review')) id: string,
  ) {
    return this.adminReviews.replies(loginToken(authorization), id);
  }

  // DELETE /v1/admin/replies/<id>   (ticket 124)
  // Deletes any reply by the writer's own rule (supabase/sql/052): with
  // answers it stays as "This reply was deleted". 200 { id, outcome:
  // "kept" | "removed", message }; 404 when it is gone already.
  @Delete('replies/:id')
  @HttpCode(200)
  deleteReply(
    @Headers('authorization') authorization: string | undefined,
    @Param('id', idOf('reply')) id: string,
  ) {
    return this.adminReviews.removeReply(loginToken(authorization), id);
  }

  // GET /v1/admin/reviews/<id>/likes and /v1/admin/replies/<id>/likes
  // (ticket 125): who marked it Helpful, newest first:
  // [{ user_id, display_name, created_at }]. Never an email. 404 when
  // the review or reply no longer exists.
  @Get('reviews/:id/likes')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  reviewLikers(
    @Headers('authorization') authorization: string | undefined,
    @Param('id', idOf('review')) id: string,
  ) {
    return this.adminReviews.likers(loginToken(authorization), 'review', id);
  }

  @Get('replies/:id/likes')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  replyLikers(
    @Headers('authorization') authorization: string | undefined,
    @Param('id', idOf('reply')) id: string,
  ) {
    return this.adminReviews.likers(loginToken(authorization), 'reply', id);
  }

  // DELETE /v1/admin/reviews/<id>/likes/<userId> and
  // /v1/admin/replies/<id>/likes/<userId>   (ticket 125)
  // Removes that traveler's Helpful mark (and its notification).
  // 200 { helpful_count, message }; 404 when it is already gone.
  @Delete('reviews/:id/likes/:userId')
  @HttpCode(200)
  removeReviewLike(
    @Headers('authorization') authorization: string | undefined,
    @Param('id', idOf('review')) id: string,
    @Param('userId', idOf('traveler')) userId: string,
  ) {
    return this.adminReviews.removeLike(loginToken(authorization), 'review', id, userId);
  }

  @Delete('replies/:id/likes/:userId')
  @HttpCode(200)
  removeReplyLike(
    @Headers('authorization') authorization: string | undefined,
    @Param('id', idOf('reply')) id: string,
    @Param('userId', idOf('traveler')) userId: string,
  ) {
    return this.adminReviews.removeLike(loginToken(authorization), 'reply', id, userId);
  }

  // POST /v1/admin/reviews/<id>/keep   (ticket 109)
  // Removes the review's reports and shows it again if it was hidden.
  // 200 { id, message }; 404 when the review no longer exists.
  @Post('reviews/:id/keep')
  @HttpCode(200)
  keep(
    @Headers('authorization') authorization: string | undefined,
    @Param('id', idOf('review')) id: string,
  ) {
    return this.adminReports.keep(loginToken(authorization), id);
  }

  // POST /v1/admin/reviews/<id>/hide   (ticket 109)
  // Hides the review from everyone but its writer and the team.
  // 200 { id, message }; 404 when the review no longer exists.
  @Post('reviews/:id/hide')
  @HttpCode(200)
  hide(
    @Headers('authorization') authorization: string | undefined,
    @Param('id', idOf('review')) id: string,
  ) {
    return this.adminReports.hide(loginToken(authorization), id);
  }

  // POST /v1/admin/reviews/<id>/show   (ticket 123)
  // Shows a hidden review again and keeps its reports.
  // 200 { id, message }; 404 when the review no longer exists.
  @Post('reviews/:id/show')
  @HttpCode(200)
  show(
    @Headers('authorization') authorization: string | undefined,
    @Param('id', idOf('review')) id: string,
  ) {
    return this.adminReports.show(loginToken(authorization), id);
  }

  // DELETE /v1/admin/reviews/<id>   (ticket 109)
  // Deletes the review with its replies, likes, reports, notifications
  // and photo. 200 { id, message }; 404 when it no longer exists.
  @Delete('reviews/:id')
  @HttpCode(200)
  remove(
    @Headers('authorization') authorization: string | undefined,
    @Param('id', idOf('review')) id: string,
  ) {
    return this.adminReports.remove(loginToken(authorization), id);
  }

  // GET /v1/admin/places   (ticket 112)
  // Every destination and accommodation, A to Z: id, type, name, kind
  // (category or kind), address, location_type.
  @Get('places')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  places(@Headers('authorization') authorization: string | undefined) {
    return this.adminPlaces.list(loginToken(authorization));
  }

  // GET /v1/admin/places/<destination|accommodation>/<id>   (ticket 112)
  // One place with the fields the Edit form changes. 404 for an unknown
  // type or id.
  @Get('places/:type/:id')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  place(
    @Headers('authorization') authorization: string | undefined,
    @Param('type') type: string,
    @Param('id', idOf('place')) id: string,
  ) {
    return this.adminPlaces.findOne(loginToken(authorization), placeType(type), id);
  }

  // PATCH /v1/admin/places/<destination|accommodation>/<id>   (ticket 112)
  // body: { name, description, address } (+ phone, email for an
  // accommodation; empty means none). Answers with the saved place.
  // 400 with a plain sentence for an empty or too long field; 404 for an
  // unknown place.
  @Patch('places/:type/:id')
  @HttpCode(200)
  updatePlace(
    @Headers('authorization') authorization: string | undefined,
    @Param('type') type: string,
    @Param('id', idOf('place')) id: string,
    @Body() body: Record<string, unknown> | undefined,
  ) {
    const checkedType = placeType(type);
    return this.adminPlaces.update(
      loginToken(authorization),
      checkedType,
      id,
      placeChangesFrom(checkedType, body),
    );
  }

  // PUT /v1/admin/places/<destination|accommodation>/<id>/credits   (ticket 132)
  // { photographer, publisher, source_url, licence, authorization_status,
  //   credit_line } adds or changes the photo's credits, and answers with
  // the saved place (credits included). 400 with a plain sentence for a
  // missing or wrong field, or "All rights reserved" without "Permission
  // from the owner"; 404 no such place.
  @Put('places/:type/:id/credits')
  @HttpCode(200)
  savePhotoCredits(
    @Headers('authorization') authorization: string | undefined,
    @Param('type') type: string,
    @Param('id', idOf('place')) id: string,
    @Body() body: Record<string, unknown> | undefined,
  ) {
    const checkedType = placeType(type);
    return this.photoCredits.save(loginToken(authorization), checkedType, id, photoCreditsFrom(body));
  }

  // POST /v1/admin/places/<destination|accommodation>   (ticket 120)
  // A form with the same fields as PATCH (name, description, address,
  // kind, location_type, latitude, longitude, + phone and email for an
  // accommodation) and a required file field "photo" (JPG, PNG or WebP,
  // up to 2 MB), plus the photo credits fields as in PUT .../credits
  // (ticket 133). Adds the place and answers 201 with it. 400 with a plain
  // sentence for a missing or wrong field or photo; nothing is saved then.
  @Post('places/:type')
  @HttpCode(201)
  @UseInterceptors(FileInterceptor('photo', { limits: { fileSize: 4 * 1024 * 1024, files: 1 } }))
  @UseFilters(PhotoTooLargeFilter)
  addPlace(
    @Headers('authorization') authorization: string | undefined,
    @Param('type') type: string,
    @Body() body: Record<string, unknown> | undefined,
    @UploadedFile() photo: UploadedPhoto | undefined,
  ) {
    const token = loginToken(authorization);
    const checkedType = placeType(type);
    const place = placeChangesFrom(checkedType, body);
    if (!photo) throw new BadRequestException('Please choose a photo of the place (JPG, PNG or WebP, up to 2 MB).');
    // The photo's credits, in the same form (ticket 133): required for a
    // new place, checked before anything is uploaded.
    const credits = photoCreditsFrom(body);
    return this.adminPlaces.create(token, checkedType, place, photo, credits);
  }

  // DELETE /v1/admin/places/<destination|accommodation>/<id>   (ticket 121)
  // Deletes the place for good, with its reviews (and their replies,
  // likes, reports, photos and notifications) and its uploaded photo.
  // 200 { id, message }; 404 for an unknown place.
  @Delete('places/:type/:id')
  @HttpCode(200)
  deletePlace(
    @Headers('authorization') authorization: string | undefined,
    @Param('type') type: string,
    @Param('id', idOf('place')) id: string,
  ) {
    const token = loginToken(authorization);
    return this.adminPlaces.remove(token, placeType(type), id);
  }

  // POST /v1/admin/places/<destination|accommodation>/<id>/photo   (ticket 119)
  // One file field "photo" (JPG, PNG or WebP, up to 2 MB). Replaces the
  // place's photo and answers with the saved place. 400 "Please choose a
  // JPG, PNG or WebP photo up to 2 MB." for a wrong file; 404 for an
  // unknown place. The upload handling keeps the file in memory and stops
  // reading past 4 MB.
  @Post('places/:type/:id/photo')
  @HttpCode(200)
  @UseInterceptors(FileInterceptor('photo', { limits: { fileSize: 4 * 1024 * 1024, files: 1 } }))
  @UseFilters(PhotoTooLargeFilter)
  replacePlacePhoto(
    @Headers('authorization') authorization: string | undefined,
    @Param('type') type: string,
    @Param('id', idOf('place')) id: string,
    @UploadedFile() photo: UploadedPhoto | undefined,
  ) {
    const token = loginToken(authorization);
    const checkedType = placeType(type);
    if (!photo) throw new BadRequestException(PHOTO_MESSAGE);
    return this.adminPlaces.replacePhoto(token, checkedType, id, photo);
  }
}
