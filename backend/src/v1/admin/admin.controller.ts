import {
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
  Post,
} from '@nestjs/common';
import { idOf } from '../id-param';
import { loginToken } from '../login-token';
import { emailAndPassword } from '../auth/auth.controller';
import { AdminOverviewService } from './admin-overview.service';
import {
  ADMIN_PLACE_TYPES,
  AdminPlacesService,
  placeChangesFrom,
  type AdminPlaceType,
} from './admin-places.service';
import { AdminReportsService } from './admin-reports.service';
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
}
