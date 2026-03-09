import { DataSource } from 'typeorm';
import { DATABASE_SOURCE } from '@/database/database.provider';
import { UserStat } from '@/database/entities/user-stat.entity';
import { QuizSession } from '@/database/entities/quiz-session.entity';

export const USER_STAT_REPOSITORY = 'QUIZ_USER_STAT_REPOSITORY';
export const QUIZ_SESSION_REPOSITORY = 'QUIZ_SESSION_REPOSITORY';

export const quizProviders = [
  {
    provide: USER_STAT_REPOSITORY,
    useFactory: (dataSource: DataSource) => dataSource.getRepository(UserStat),
    inject: [DATABASE_SOURCE],
  },
  {
    provide: QUIZ_SESSION_REPOSITORY,
    useFactory: (dataSource: DataSource) =>
      dataSource.getRepository(QuizSession),
    inject: [DATABASE_SOURCE],
  },
];
