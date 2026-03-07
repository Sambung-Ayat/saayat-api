import { 
  Controller, 
  Get, 
  Query, 
  BadRequestException, 
  ServiceUnavailableException,
  Logger,
} from '@nestjs/common';
import { QuestionService } from './question.service';
import { Question } from '@/common/interfaces/quran.interface';
import { successResponse, AppResponse } from '@/common/utils/response.util';

@Controller('/question')
export class QuestionController {
  private readonly logger = new Logger(QuestionController.name);

  constructor(private readonly questionService: QuestionService) {}

  @Get()
  async getQuestion(
    @Query('juz') juzParam?: string,
    @Query('surah') surahParam?: string,
    @Query('lang') langParam?: string,
  ): Promise<AppResponse<Question>> {
    let juzNumbers: number[] = [];
    if (juzParam) {
      juzNumbers = Array.from(
        new Set(
          juzParam
            .split(',')
            .map((v) => parseInt(v.trim(), 10))
            .filter((v) => !isNaN(v))
        )
      );

      if (juzNumbers.some((n) => n < 1 || n > 30)) {
        throw new BadRequestException('Invalid Juz number. Must be between 1 and 30.');
      }
    }

    const juz = juzNumbers.length === 0 
      ? undefined 
      : juzNumbers.length === 1 
        ? juzNumbers[0] 
        : juzNumbers;
        
    const lang = langParam === 'en' ? 'en' : 'id';

    try {
      const generated = await this.questionService.generateQuestion(
        juz, 
        surahParam || undefined, 
        lang
      );

      const question: Question = {
        currentAyah: generated.currentAyah,
        options: generated.options,
        challengeToken: generated.challengeToken,
      };
      
      return successResponse('Question generated successfully.', question);
    } catch (error) {
      this.logger.error('Failed to generate question', error instanceof Error ? error.stack : String(error));
      throw new ServiceUnavailableException('Failed to generate question. Please try again.');
    }
  }
}