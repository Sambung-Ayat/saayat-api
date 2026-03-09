import { Controller, Get, Post, Query, Body } from '@nestjs/common';
import {
  AllowAnonymous,
  OptionalAuth,
  Session,
  UserSession,
} from '@thallesp/nestjs-better-auth';
import { QuizService } from './quiz.service';
import { QuestionQueryDto } from './dto/question-query.dto';
import { ValidateAnswerDto } from './dto/validate-answer.dto';

@Controller('quiz')
export class QuizController {
  constructor(private readonly quizService: QuizService) {}

  @Get('question')
  @AllowAnonymous()
  getQuestion(@Query() query: QuestionQueryDto) {
    return this.quizService.getQuestion(query);
  }

  @Get('surahs')
  @AllowAnonymous()
  getSurahs(@Query('juz') juz: string) {
    return this.quizService.getSurahs(juz);
  }

  @Post('validate')
  @OptionalAuth() // ← logged in = saves stats, guest = just validates
  validateAnswer(
    @Body() dto: ValidateAnswerDto,
    @Session() session: UserSession,
  ) {
    return this.quizService.validateAnswer(dto, session?.user?.id ?? null);
  }
}
