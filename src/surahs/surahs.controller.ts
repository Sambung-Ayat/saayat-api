import { Controller, Get, Query, BadRequestException, ServiceUnavailableException, Logger } from '@nestjs/common';
import { SurahsService } from './surahs.service';
import { SurahData } from './interfaces/surah-data.interface';
import { successResponse, AppResponse } from '@/common/utils/response.util';

@Controller('/surahs')
export class SurahsController {
  private readonly logger = new Logger(SurahsController.name);

  constructor(private readonly surahsService: SurahsService) {}

  @Get()
  async getSurahs(@Query('juz') juzParam: string): Promise<AppResponse<SurahData[]>> {
    if (!juzParam) {
      throw new BadRequestException('Juz parameter is required');
    }

    const juzNumbers = Array.from(
      new Set(
        juzParam
          .split(',')
          .map(v => parseInt(v.trim(), 10))
          .filter(v => !isNaN(v))
      )
    );

    if (juzNumbers.length === 0 || juzNumbers.some(juz => juz < 1 || juz > 30)) {
      throw new BadRequestException('Invalid Juz number');
    }

    try {
      const data = await this.surahsService.getSurahsByJuz(juzNumbers);
      return successResponse('Surahs fetched successfully.', data);
    } catch (error) {
      this.logger.error('Failed to fetch surahs', error instanceof Error ? error.stack : String(error));
      throw new ServiceUnavailableException('Failed to fetch surahs');
    }
  }
}
