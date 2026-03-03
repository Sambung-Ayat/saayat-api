import { Injectable } from '@nestjs/common';
import {
  HealthCheckService,
  HealthCheck,
  HealthIndicatorResult,
} from '@nestjs/terminus';

@Injectable()
export class AppService {
  constructor(private readonly health: HealthCheckService) {}

  @HealthCheck()
  getHealth() {
    return this.health.check([
      async (): Promise<HealthIndicatorResult> => ({
        app: { status: 'up', timestamp: new Date().toLocaleString('id-ID') },
      }),
    ]);
  }
}
