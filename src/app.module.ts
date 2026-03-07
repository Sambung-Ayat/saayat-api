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
import { AlquranModule } from './alquran/alquran.module';
import { SurahsModule } from './surahs/surahs.module';
import { QuestionModule } from './question/question.module';
import { ValidateModule } from './validate/validate.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    WinstonModule.forRootAsync({
      useClass: WinstonConfig,
    }),
    TerminusModule,
    DatabaseModule,
    //AuthModule.forRoot({ auth }),
    AlquranModule,
    SurahsModule,
    QuestionModule,
    ValidateModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
