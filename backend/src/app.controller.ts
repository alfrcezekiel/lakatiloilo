import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  // Checks the backend can really reach the database. Answers 503 if not,
  // so a host or monitor can tell the app is unhealthy.
  @Get('health')
  async getHealth(): Promise<object> {
    const details = this.appService.healthDetails();
    if (!(await this.appService.isDatabaseUp())) {
      throw new ServiceUnavailableException({
        status: 'error',
        message: 'The database is not reachable.',
        ...details,
      });
    }
    return { status: 'ok', message: 'Lakat Iloilo backend is running', ...details };
  }
}
