import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { WinstonModule } from 'nest-winston';
import { TerminusModule } from '@nestjs/terminus';
import { AuthModule } from '@thallesp/nestjs-better-auth';
import { DatabaseModule } from '@/database/database.module';
import { WinstonConfig } from '@/logger/winston.config';
import { AppController } from '@/app.controller';
import { AppService } from '@/app.service';
import { auth } from '@/auth/auth';
import { UserModule } from '@/user/user.module';
import { LeaderboardModule } from '@/leaderboard/leaderboard.module';
import { QuizModule } from '@/quiz/quiz.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    WinstonModule.forRootAsync({
      useClass: WinstonConfig,
    }),
    TerminusModule,
    DatabaseModule,
    AuthModule.forRoot({ auth }),
    AuthModule.forRoot({ auth }),
    UserModule,
    LeaderboardModule,
    QuizModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
