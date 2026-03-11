import { createAuthMiddleware } from 'better-auth/api';
import { AppDataSource } from '@/database/data-source';
import { UserStat } from '@/database/entities/user-stat.entity';
import { QuizSession } from '@/database/entities/quiz-session.entity';

export const mergeGuestHook = createAuthMiddleware(async (ctx) => {
  if (!ctx.path.startsWith('/sign-in/social')) return;

  const newSession = ctx.context.newSession;
  if (!newSession) return;

  const userId = newSession.user.id;
  const guestId = ctx.headers?.get('x-guest-id');

  if (!guestId) return;

  try {
    const dataSource = AppDataSource.isInitialized
      ? AppDataSource
      : await AppDataSource.initialize();

    const userStatRepo = dataSource.getRepository(UserStat);
    const quizSessionRepo = dataSource.getRepository(QuizSession);

    const guestStat = await userStatRepo.findOne({
      where: { userId: guestId },
    });
    if (!guestStat) return;

    let userStat = await userStatRepo.findOne({ where: { userId } });

    if (!userStat) {
      userStat = userStatRepo.create({
        userId,
        totalCorrect: guestStat.totalCorrect,
        totalAttempted: guestStat.totalAttempted,
        currentStreak: guestStat.currentStreak,
        longestStreak: guestStat.longestStreak,
        currentCorrectStreak: guestStat.currentCorrectStreak,
        longestCorrectStreak: guestStat.longestCorrectStreak,
        totalPoints: guestStat.totalPoints,
        lastActiveAt: guestStat.lastActiveAt,
      });
    } else {
      userStat.totalCorrect += guestStat.totalCorrect;
      userStat.totalAttempted += guestStat.totalAttempted;
      userStat.totalPoints += guestStat.totalPoints;
      userStat.longestStreak = Math.max(
        userStat.longestStreak,
        guestStat.longestStreak,
      );
      userStat.longestCorrectStreak = Math.max(
        userStat.longestCorrectStreak,
        guestStat.longestCorrectStreak,
      );
    }

    await dataSource.transaction(async (manager) => {
      await manager.save(UserStat, userStat);
      await manager.update(QuizSession, { userId: guestId }, { userId });
      await manager.delete(UserStat, { userId: guestId });
    });

    console.log(`Guest ${guestId} merged into user ${userId}`);
  } catch (err) {
    console.error('Failed to merge guest data', err);
  }
});
