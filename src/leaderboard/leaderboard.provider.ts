import { DataSource } from 'typeorm';
import { DATABASE_SOURCE } from '@/database/database.provider';
import { UserStat } from '@/database/entities/user-stat.entity';
import { User } from '@/database/entities/user.entity';

export const USER_STAT_REPOSITORY = 'USER_STAT_REPOSITORY';
export const USER_REPOSITORY = 'USER_REPOSITORY';

export const leaderboardProviders = [
  {
    provide: USER_STAT_REPOSITORY,
    useFactory: (dataSource: DataSource) => dataSource.getRepository(UserStat),
    inject: [DATABASE_SOURCE],
  },
  {
    provide: USER_REPOSITORY,
    useFactory: (dataSource: DataSource) => dataSource.getRepository(User),
    inject: [DATABASE_SOURCE],
  },
];
