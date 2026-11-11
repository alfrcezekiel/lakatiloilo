import { Body, Controller, Delete, Get, Header, Headers, HttpCode, Param, Post } from '@nestjs/common';
import { loginToken } from '../login-token';
import { CategoriesService, newCategoryFrom } from '../categories/categories.service';

// The dashboard's "Categories and kinds" panel (full admin management
// round, ticket 116). Admins only: AdminOnlyMiddleware runs first (see
// AdminModule), and adding and deleting run as the admin, so the database
// decides too.
@Controller('v1/admin/categories')
export class AdminCategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  // GET /v1/admin/categories
  // Every category and kind with how many places use it.
  @Get()
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  list() {
    return this.categories.listWithCounts();
  }

  // POST /v1/admin/categories
  // body: { name, applies_to: "destination" | "accommodation" }
  // Adds one and answers { id, name, applies_to, place_count: 0 }.
  // 400 for a name outside 2 to 30 characters; 409 "That name is already
  // used."
  @Post()
  @HttpCode(201)
  add(
    @Headers('authorization') authorization: string | undefined,
    @Body() body: Record<string, unknown> | undefined,
  ) {
    return this.categories.add(loginToken(authorization), newCategoryFrom(body));
  }

  // DELETE /v1/admin/categories/<id>
  // Deletes one that no place uses: 200 { id, message }. 409 "Some places
  // still use it."; 404 for an unknown one.
  @Delete(':id')
  @HttpCode(200)
  remove(@Headers('authorization') authorization: string | undefined, @Param('id') id: string) {
    return this.categories.remove(loginToken(authorization), id);
  }
}
