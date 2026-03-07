import {
  Controller,
  Post,
  Body,
  ServiceUnavailableException,
  Logger,
} from '@nestjs/common';
import { ValidateService } from './validate.service';
import { ValidateAnswerDto } from './dto/validate-answer.dto';
import { successResponse, AppResponse } from '@/common/utils/response.util';
import { ValidationResponse } from '@/common/interfaces/quran.interface';

@Controller('/validate')
export class ValidateController {
  private readonly logger = new Logger(ValidateController.name);

  constructor(private readonly validateService: ValidateService) {}

  @Post()
  async validateAnswer(
    @Body() dto: ValidateAnswerDto,
  ): Promise<AppResponse<ValidationResponse>> {
    try {
      const result = await this.validateService.validateAnswer(dto);
      return successResponse('Answer validated successfully.', result);
    } catch (error) {
      if (error instanceof Error && 'getStatus' in error) throw error;

      this.logger.error(
        'Unexpected validation error',
        error instanceof Error ? error.stack : String(error),
      );
      throw new ServiceUnavailableException('Validation failed. Please try again.');
    }
  }
}
