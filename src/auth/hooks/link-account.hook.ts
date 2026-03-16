import { AppDataSource } from '@/database/data-source';
import { UserStat } from '@/database/entities/user-stat.entity';
import { QuizSession } from '@/database/entities/quiz-session.entity';

export async function onLinkAccount({ anonymousUser, newUser }) {
  const guestId = anonymousUser.user.id;
  const userId = newUser.user.id;

  const dataSource = AppDataSource.isInitialized
    ? AppDataSource
    : await AppDataSource.initialize();

  const guestStat = await dataSource
    .getRepository(UserStat)
    .findOne({ where: { userId: guestId } });
  if (!guestStat) return;

  await dataSource.transaction(async (manager) => {
    let userStat = await manager.findOne(UserStat, { where: { userId } });

    if (!userStat) {
      userStat = manager.create(UserStat, { ...guestStat, userId });
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

    await manager.save(UserStat, userStat);
    await manager.update(QuizSession, { userId: guestId }, { userId });
    await manager.delete(UserStat, { userId: guestId });
  });
}
