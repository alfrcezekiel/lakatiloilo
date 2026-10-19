import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  // A cheap "is it up?" check that does not touch the database.
  @Get('health')
  getHealth(): object {
    return { status: 'ok', message: 'Lakat Iloilo backend is running' };
  }
}
