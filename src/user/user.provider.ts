import { DataSource } from 'typeorm';
import { DATABASE_SOURCE } from '@/database/database.provider';
import { User } from '@/database/entities/user.entity';
import { UserStat } from '@/database/entities/user-stat.entity';
import { QuizSession } from '@/database/entities/quiz-session.entity';

export const USER_REPOSITORY = 'USER_USER_REPOSITORY';
export const USER_STAT_REPOSITORY = 'USER_STAT_REPOSITORY';
export const QUIZ_SESSION_REPOSITORY = 'USER_QUIZ_SESSION_REPOSITORY';

export const userProviders = [
  {
    provide: USER_REPOSITORY,
    useFactory: (dataSource: DataSource) => dataSource.getRepository(User),
    inject: [DATABASE_SOURCE],
  },
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
