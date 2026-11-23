import { Global, Module, type INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { getDataSourceToken, getEntityManagerToken } from '@nestjs/typeorm';
import { configureApp } from '../../src/app-setup';
import { SupabaseService } from '../../src/supabase/supabase.service';
import { V1Module } from '../../src/v1/v1.module';
import { fakeDataSource } from '../fakes/database.fake';
import { fakeSupabase } from '../fakes/supabase.fake';

// The website addresses the test app accepts (CORS), like CORS_ORIGINS.
export const ALLOWED_ORIGIN = 'http://localhost:3000';

// Builds the REAL /v1 API — controllers, the admin middleware, pipes,
// AdminAccess and TravelerTransactions — with only its two connections to
// the outside swapped for pretend ones:
//   - the database (an empty pretend DataSource instead of DatabaseModule),
//   - Supabase Auth (a pretend SupabaseService that knows two tokens).
// It reads no backend/.env, so no real address, key or password is used.
// origins: the CORS_ORIGINS list; [] is the live setup since ticket 152.
export async function createTestApp({ origins = [ALLOWED_ORIGIN] }: { origins?: string[] } = {}): Promise<{
  app: INestApplication;
  supabase: ReturnType<typeof fakeSupabase>;
}> {
  const dataSource = fakeDataSource();
  const supabase = fakeSupabase();

  @Global()
  @Module({
    providers: [
      { provide: getDataSourceToken(), useValue: dataSource },
      { provide: getEntityManagerToken(), useValue: dataSource.manager },
    ],
    exports: [getDataSourceToken(), getEntityManagerToken()],
  })
  class PretendDatabaseModule {}

  const moduleRef = await Test.createTestingModule({
    imports: [ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }), PretendDatabaseModule, V1Module],
  })
    .overrideProvider(SupabaseService)
    .useValue(supabase)
    .compile();

  const app = moduleRef.createNestApplication<NestExpressApplication>({ logger: false });
  configureApp(app, origins);
  await app.init();
  return { app, supabase };
}
