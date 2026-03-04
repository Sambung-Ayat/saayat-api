import { Injectable } from '@nestjs/common';
import {
  HealthCheckService,
  HealthCheck,
  HealthIndicatorResult,
} from '@nestjs/terminus';
import { DatabaseHealthIndicator } from '@/database/database.health';

@Injectable()
export class AppService {
  constructor(
    private readonly health: HealthCheckService,
    private readonly db: DatabaseHealthIndicator,
  ) {}

  @HealthCheck()
  getHealth() {
    return this.health.check([
      async (): Promise<HealthIndicatorResult> => ({
        app: { status: 'up', timestamp: new Date().toLocaleString('id-ID') },
      }),
      () => this.db.pingCheck('database'),
    ]);
  }
}
