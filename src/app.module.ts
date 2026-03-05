import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { WinstonModule } from 'nest-winston';
import { TerminusModule } from '@nestjs/terminus';
import { DatabaseModule } from '@/database/database.module';
import { WinstonConfig } from '@/logger/winston.config';
import { AuthModule } from '@thallesp/nestjs-better-auth';
import { AppController } from '@/app.controller';
import { AppService } from '@/app.service';
import { auth } from '@/auth/auth';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    WinstonModule.forRootAsync({
      useClass: WinstonConfig,
    }),
    TerminusModule,
    DatabaseModule,
    AuthModule.forRoot({ auth }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
