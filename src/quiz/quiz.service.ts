import {
  Injectable,
  Inject,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { IsNull, Repository } from 'typeorm';
import { QuranService } from '@/quran/quran.service';
import { QuestionService } from '@/question/question.service';
import { verifyChallenge } from '@/common/utils/security.util';
import { UserStat } from '@/database/entities/user-stat.entity';
import { successResponse, AppResponse } from '@/common/utils/response.util';
import { USER_STAT_REPOSITORY } from '@/quiz/quiz.provider';
import { QuestionQueryDto } from '@/quiz/dto/question-query.dto';
import { ValidateAnswerDto } from '@/quiz/dto/validate-answer.dto';
import { QuizSession } from '@/database/entities/quiz-session.entity';
import { QUIZ_SESSION_REPOSITORY } from '@/quiz/quiz.provider';

@Injectable()
export class QuizService {
  private readonly logger = new Logger(QuizService.name);
  // In-memory juz→surah cache (same pattern as original)
  private readonly juzSurahCache = new Map<
    number,
    { id: number; name: string; englishName: string }[]
  >();

  constructor(
    private readonly quranService: QuranService,
    private readonly questionService: QuestionService,

    @Inject(USER_STAT_REPOSITORY)
    private readonly userStatRepo: Repository<UserStat>,

    @Inject(QUIZ_SESSION_REPOSITORY)
    private readonly quizSessionRepo: Repository<QuizSession>,
  ) {}

  // ── GET /quiz/question ─────────────────────────────────────────────────────

  async getQuestion(query: QuestionQueryDto) {
    const { juz: juzParam, surah: surahParam, lang = 'id' } = query;

    const juzNumbers = juzParam
      ? Array.from(
          new Set(
            juzParam
              .split(',')
              .map((v) => v.trim())
              .filter(Boolean)
              .map((v) => parseInt(v, 10)),
          ),
        )
      : [];

    if (juzNumbers.some((n) => isNaN(n) || n < 1 || n > 30)) {
      throw new BadRequestException(
        'Invalid Juz number. Must be between 1 and 30.',
      );
    }

    const juz =
      juzNumbers.length === 0
        ? undefined
        : juzNumbers.length === 1
          ? juzNumbers[0]
          : juzNumbers;

    const generated = await this.questionService.generateQuestion(
      juz,
      surahParam,
      lang,
    );

    return successResponse('Question generated successfully', {
      currentAyah: generated.currentAyah,
      options: generated.options,
      challengeToken: generated.challengeToken,
    });
  }

  // ── GET /quiz/surahs ───────────────────────────────────────────────────────

  async getSurahs(
    juzParam: string,
  ): Promise<AppResponse<{ id: number; name: string; englishName: string }[]>> {
    if (!juzParam) throw new BadRequestException('Juz parameter is required');

    const juzNumbers = Array.from(
      new Set(
        juzParam
          .split(',')
          .map((v) => v.trim())
          .filter(Boolean)
          .map((v) => parseInt(v, 10)),
      ),
    );

    if (
      !juzNumbers.length ||
      juzNumbers.some((j) => isNaN(j) || j < 1 || j > 30)
    ) {
      throw new BadRequestException('Invalid Juz number');
    }

    const combinedSurahs = new Map<
      number,
      { id: number; name: string; englishName: string }
    >();

    for (const juz of juzNumbers) {
      let surahsForJuz = this.juzSurahCache.get(juz);

      if (!surahsForJuz) {
        const ayahs = await this.quranService.fetchJuz(juz);
        const surahMap = new Map<
          number,
          { id: number; name: string; englishName: string }
        >();

        ayahs.forEach((ayah) => {
          if (!surahMap.has(ayah.surah.number)) {
            surahMap.set(ayah.surah.number, {
              id: ayah.surah.number,
              name: ayah.surah.name,
              englishName: ayah.surah.englishName,
            });
          }
        });

        surahsForJuz = Array.from(surahMap.values()).sort(
          (a, b) => a.id - b.id,
        );
        this.juzSurahCache.set(juz, surahsForJuz);
      }

      surahsForJuz.forEach((s) => {
        if (!combinedSurahs.has(s.id)) combinedSurahs.set(s.id, s);
      });
    }

    const result = Array.from(combinedSurahs.values()).sort(
      (a, b) => a.id - b.id,
    );
    return successResponse('Surahs fetched successfully', result);
  }

  // ── POST /quiz/validate ────────────────────────────────────────────────────

  async validateAnswer(
    dto: ValidateAnswerDto,
    userId: string | null,
  ): Promise<AppResponse<any>> {
    const { choiceKey, challengeToken, sessionLimit } = dto;

    const payload = verifyChallenge(challengeToken);
    if (!payload)
      throw new ForbiddenException('Invalid or expired challenge token');

    const selectedAyahId = payload.choiceMap[choiceKey];
    const isCorrect = selectedAyahId === payload.correctId;
    const correctAyah = await this.quranService.fetchNextAyah(
      payload.currentAyahId,
    );

    let stats: any = null;

    if (userId) {
      try {
        stats = await this.updateUserStats(userId, isCorrect, sessionLimit);
      } catch (err) {
        this.logger.error('Failed to save progress to DB', err);
      }
    }

    return successResponse('Answer validated', {
      isCorrect,
      currentStreak: isCorrect ? stats?.currentStreak : undefined,
      longestStreak: isCorrect ? stats?.longestStreak : undefined,
      currentCorrectStreak: isCorrect ? stats?.currentCorrectStreak : undefined,
      comboStreak: stats?.comboStreak,
      pointsGained: stats?.pointsGained,
      totalPoints: stats?.totalPoints,
      remainingQuestions: stats?.remainingQuestions,
      correctAyah: !isCorrect
        ? {
            id: correctAyah.number,
            text: correctAyah.text,
            surah: correctAyah.surah.number,
            ayah: correctAyah.numberInSurah,
          }
        : undefined,
    });
  }

  // ── Private: update user stats ─────────────────────────────────────────────

  private async updateUserStats(
    userId: string,
    isCorrect: boolean,
    sessionLimit?: number,
  ) {
    const targetLimit = sessionLimit || 10;

    // ── Find or create active session ────────────────────────────────────────
    let quizSession = await this.quizSessionRepo.findOne({
      where: { userId, endedAt: IsNull() },
    });

    // Close session if limit changed or already full
    if (
      quizSession &&
      (quizSession.totalQuestions >= quizSession.maxQuestions ||
        quizSession.maxQuestions !== targetLimit)
    ) {
      quizSession.endedAt = new Date();
      await this.quizSessionRepo.save(quizSession);
      quizSession = null;
    }

    if (!quizSession) {
      quizSession = this.quizSessionRepo.create({
        userId,
        maxQuestions: targetLimit,
      });
      await this.quizSessionRepo.save(quizSession);
    }

    // ── User stat ─────────────────────────────────────────────────────────────
    let userStat = await this.userStatRepo.findOne({ where: { userId } });
    if (!userStat) {
      userStat = this.userStatRepo.create({ userId });
      await this.userStatRepo.save(userStat);
    }

    const now = new Date();
    const lastActive = userStat.lastActiveAt
      ? new Date(userStat.lastActiveAt)
      : null;
    const isSameDay = lastActive
      ? now.toDateString() === lastActive.toDateString()
      : false;
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = lastActive
      ? yesterday.toDateString() === lastActive.toDateString()
      : false;

    let newCurrentStreak = userStat.currentStreak;
    let newCurrentCorrectStreak = userStat.currentCorrectStreak;

    // ── Combo logic ───────────────────────────────────────────────────────────
    const newComboStreak = isCorrect ? quizSession.comboStreak + 1 : 0;
    const newMaxCombo = Math.max(quizSession.maxCombo, newComboStreak);
    let gainedPoints = 0;

    if (isCorrect) {
      if (isSameDay) newCurrentStreak = Math.max(userStat.currentStreak, 1);
      else if (isYesterday) newCurrentStreak += 1;
      else newCurrentStreak = 1;

      newCurrentCorrectStreak += 1;

      const basePoint = 10;
      const bonus = newComboStreak >= 3 ? newComboStreak * 5 : 0;
      gainedPoints = basePoint + bonus;
    } else {
      newCurrentCorrectStreak = 0;
    }

    const newTotalQuestions = quizSession.totalQuestions + 1;
    const isSessionFinished = newTotalQuestions >= quizSession.maxQuestions;

    // ── Update quiz session ───────────────────────────────────────────────────
    quizSession.totalQuestions = newTotalQuestions;
    quizSession.correctAnswers += isCorrect ? 1 : 0;
    quizSession.comboStreak = newComboStreak;
    quizSession.maxCombo = newMaxCombo;
    quizSession.totalPoints += gainedPoints;
    if (isSessionFinished) quizSession.endedAt = new Date();
    await this.quizSessionRepo.save(quizSession);

    // ── Update user stat ──────────────────────────────────────────────────────
    userStat.totalAttempted += 1;
    userStat.totalCorrect += isCorrect ? 1 : 0;
    userStat.totalPoints += gainedPoints;
    userStat.currentCorrectStreak = newCurrentCorrectStreak;
    userStat.longestCorrectStreak = Math.max(
      userStat.longestCorrectStreak,
      newCurrentCorrectStreak,
    );
    if (isCorrect) {
      userStat.currentStreak = newCurrentStreak;
      userStat.longestStreak = Math.max(
        userStat.longestStreak,
        newCurrentStreak,
      );
      userStat.lastActiveAt = now;
    }
    await this.userStatRepo.save(userStat);

    return {
      currentStreak: userStat.currentStreak,
      longestStreak: userStat.longestStreak,
      currentCorrectStreak: userStat.currentCorrectStreak,
      comboStreak: newComboStreak,
      pointsGained: gainedPoints,
      totalPoints: userStat.totalPoints,
      remainingQuestions: quizSession.maxQuestions - newTotalQuestions,
      sessionFinished: isSessionFinished,
    };
  }
}
