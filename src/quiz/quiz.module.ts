import { Module } from '@nestjs/common';
import { QuranModule } from '@/quran/quran.module';
import { QuestionModule } from '@/question/question.module';
import { DatabaseModule } from '@/database/database.module';
import { QuizController } from './quiz.controller';
import { QuizService } from '@/quiz/quiz.service';
import { quizProviders } from '@/quiz/quiz.provider';

@Module({
  imports: [QuranModule, QuestionModule, DatabaseModule],
  controllers: [QuizController],
  providers: [...quizProviders, QuizService],
})
export class QuizModule {}
