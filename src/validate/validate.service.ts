import { Injectable, BadRequestException } from '@nestjs/common';
import { AlquranService } from '@/alquran/alquran.service';
import { ValidateAnswerDto } from './dto/validate-answer.dto';
import { ValidationResponse } from '@/common/interfaces/quran.interface';
import { verifyChallenge } from '@/common/utils/security.util';

@Injectable()
export class ValidateService {
  constructor(private readonly alquranService: AlquranService) {}

  async validateAnswer(dto: ValidateAnswerDto): Promise<ValidationResponse> {

    const payload = verifyChallenge(dto.challengeToken);
    if (!payload) {
      throw new BadRequestException('Invalid or expired challenge token.');
    }

    const selectedAyahId = payload.choiceMap[dto.choiceKey];
    if (selectedAyahId === undefined) {
      throw new BadRequestException('Invalid choice key.');
    }

    const isCorrect = selectedAyahId === payload.correctId;

    const correctAyah = await this.alquranService.fetchAyahByGlobalNumber(payload.correctId);

    return {
      isCorrect,
      correctAyah: {
        id: correctAyah.number,
        text: correctAyah.text,
        surah: correctAyah.surah.number,
        ayah: correctAyah.numberInSurah,
      },
    };
  }
}
