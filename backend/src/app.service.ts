import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

// A health check should answer quickly even when the database hangs.
const HEALTH_TIMEOUT_MS = 3_000;

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly config: ConfigService,
  ) {}

  getHello(): string {
    return 'Lakat Iloilo Backend API';
  }

  // Which environment and code version answered. Vercel provides the commit
  // automatically; other hosts can set GIT_COMMIT_SHA.
  healthDetails() {
    return {
      appEnv: this.config.get<string>('APP_ENV'),
      commit: process.env.VERCEL_GIT_COMMIT_SHA || process.env.GIT_COMMIT_SHA || null,
    };
  }

  async isDatabaseUp(): Promise<boolean> {
    let timer: NodeJS.Timeout | undefined;
    const timeout = new Promise<never>((_resolve, reject) => {
      timer = setTimeout(() => reject(new Error('timeout')), HEALTH_TIMEOUT_MS);
    });
    try {
      await Promise.race([this.dataSource.query('SELECT 1'), timeout]);
      return true;
    } catch {
      // The driver's error can name the database host, so it is not logged.
      this.logger.error('Health check failed: the database did not answer SELECT 1.');
      return false;
    } finally {
      clearTimeout(timer);
    }
  }
}
