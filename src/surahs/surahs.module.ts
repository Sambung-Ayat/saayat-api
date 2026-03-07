import { AlquranModule } from '@/alquran/alquran.module';
import { Module } from '@nestjs/common';
import { SurahsController } from './surahs.controller';
import { SurahsService } from './surahs.service';

@Module({
  imports: [AlquranModule],
  controllers: [SurahsController],
  providers: [SurahsService]
})
export class SurahsModule {}
