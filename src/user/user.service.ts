import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { User } from '@/database/entities/user.entity';
import { UserStat } from '@/database/entities/user-stat.entity';
import { QuizSession } from '@/database/entities/quiz-session.entity';
import { DATABASE_SOURCE } from '@/database/database.provider';
import { successResponse, AppResponse } from '@/common/utils/response.util';
import { UpdateDisplayNameDto } from '@/user/dto/update-display-name.dto';
import {
  USER_REPOSITORY,
  USER_STAT_REPOSITORY,
  QUIZ_SESSION_REPOSITORY,
} from '@/user/user.provider';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @Inject(DATABASE_SOURCE)
    private readonly dataSource: DataSource,

    @Inject(USER_REPOSITORY)
    private readonly userRepo: Repository<User>,

    @Inject(USER_STAT_REPOSITORY)
    private readonly userStatRepo: Repository<UserStat>,

    @Inject(QUIZ_SESSION_REPOSITORY)
    private readonly quizSessionRepo: Repository<QuizSession>,
  ) {}

  // ── GET /user/me ────────────────────────────────────────────────────────────

  async getProfile(userId: string): Promise<AppResponse<any>> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const stat = await this.userStatRepo.findOne({ where: { userId } });

    return successResponse('User profile fetched successfully', {
      id: user.id,
      email: user.email,
      displayName: user.name,
      emailVerified: user.emailVerified,
      image: user.image,
      totalCorrect: stat?.totalCorrect ?? 0,
      totalPoints: stat?.totalPoints ?? 0,
      longestStreak: stat?.longestStreak ?? 0,
      totalAttempted: stat?.totalAttempted ?? 0,
      currentStreak: stat?.currentStreak ?? 0,
      longestCorrectStreak: stat?.longestCorrectStreak ?? 0,
    });
  }

  // ── PUT /user/me ────────────────────────────────────────────────────────────

  async updateDisplayName(
    userId: string,
    dto: UpdateDisplayNameDto,
  ): Promise<AppResponse<any>> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    user.name = dto.displayName.trim();
    await this.userRepo.save(user);

    return successResponse('Display name updated successfully', {
      id: user.id,
      displayName: user.name,
      email: user.email,
    });
  }

  // ── DELETE /user/me ─────────────────────────────────────────────────────────

  async deleteAccount(userId: string): Promise<AppResponse<null>> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    // Delete in a transaction — order matters due to foreign keys
    await this.dataSource.transaction(async (manager) => {
      await manager.delete(QuizSession, { userId });
      await manager.delete(UserStat, { userId });
      // Deleting user cascades account, session (Better Auth tables)
      await manager.delete(User, { id: userId });
    });

    return successResponse('Account deleted successfully', null);
  }
}
