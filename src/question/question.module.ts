import { Module } from '@nestjs/common';
import { QuestionController } from './question.controller';
import { QuestionService } from './question.service';
import { AlquranModule } from '@/alquran/alquran.module';

@Module({
  imports: [AlquranModule],
  controllers: [QuestionController],
  providers: [QuestionService],
})
export class QuestionModule {}
