import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TerminusModule } from '@nestjs/terminus';
import { databaseProviders } from '@/database/database.provider';
import { DatabaseHealthIndicator } from '@/database/database.health';

@Module({
  imports: [ConfigModule, TerminusModule],
  providers: [...databaseProviders, DatabaseHealthIndicator],
  exports: [...databaseProviders, DatabaseHealthIndicator],
})
export class DatabaseModule {}
