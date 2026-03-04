import { Injectable, Inject } from '@nestjs/common';
import {
  HealthIndicatorResult,
  HealthIndicatorService,
} from '@nestjs/terminus';
import { DataSource } from 'typeorm';
import { DATABASE_SOURCE } from '@/database/database.provider';

@Injectable()
export class DatabaseHealthIndicator {
  constructor(
    @Inject(DATABASE_SOURCE) private readonly dataSource: DataSource,
    private readonly healthIndicatorService: HealthIndicatorService,
  ) {}

  async pingCheck(key: string): Promise<HealthIndicatorResult> {
    const indicator = this.healthIndicatorService.check(key);

    try {
      await this.dataSource.query('SELECT 1');
      return indicator.up(); // ← replaces getStatus(key, true)
    } catch (error) {
      return indicator.down({ message: (error as any).message });
    }
  }
}
