import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Destination } from './entities/destination.entity';
import { Accommodation } from './entities/accommodation.entity';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    @InjectRepository(Destination)
    private destinationsRepository: Repository<Destination>,
    @InjectRepository(Accommodation)
    private accommodationsRepository: Repository<Accommodation>,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  getHealth(): object {
    return { status: 'ok', message: 'Lakat Iloilo backend is running' };
  }

  @Get('test-db')
  async testDatabase() {
    try {
      const destinationCount = await this.destinationsRepository.count();
      const accommodationCount = await this.accommodationsRepository.count();
      return {
        status: 'ok',
        message: 'Database connection successful',
        destinations: destinationCount,
        accommodations: accommodationCount,
      };
    } catch {
      // No error details here: this URL is public once deployed, and raw
      // database errors can reveal hostnames and table names.
      return {
        status: 'error',
        message: 'Database connection failed',
      };
    }
  }
}
