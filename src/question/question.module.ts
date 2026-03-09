import { Module } from '@nestjs/common';
import { QuranModule } from '@/quran/quran.module';
import { QuestionService } from './question.service';

@Module({
  imports: [QuranModule],
  providers: [QuestionService],
  exports: [QuestionService],
})
export class QuestionModule {}
