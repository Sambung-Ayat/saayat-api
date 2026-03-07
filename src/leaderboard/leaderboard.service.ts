import { Injectable, Inject } from '@nestjs/common';
import { Repository } from 'typeorm';
import { UserStat } from '@/database/entities/user-stat.entity';
import { User } from '@/database/entities/user.entity';
import {
  USER_STAT_REPOSITORY,
  USER_REPOSITORY,
} from '@/leaderboard/leaderboard.provider';
import { SortBy } from '@/leaderboard/dto/leaderboard-query.dto';
import { successResponse, AppResponse } from '@/common/utils/response.util';

type LeaderboardEntry = {
  id: string;
  displayName: string | null;
  longestStreak: number;
  longestCorrectStreak: number;
  totalCorrect: number;
  totalPoints: number;
};

type LeaderboardResponse = {
  topUsers: LeaderboardEntry[];
  currentUser: (LeaderboardEntry & { rank: number }) | null;
};

@Injectable()
export class LeaderboardService {
  constructor(
    @Inject(USER_STAT_REPOSITORY)
    private readonly userStatRepo: Repository<UserStat>,

    @Inject(USER_REPOSITORY)
    private readonly userRepo: Repository<User>,
  ) {}

  async getLeaderboard(
    sortBy: SortBy = SortBy.POINTS,
    currentUserId: string | null = null,
  ): Promise<AppResponse<LeaderboardResponse>> {
    const orderBy = this.resolveOrderBy(sortBy);

    // Top 10 users
    const topUsers = await this.userStatRepo
      .createQueryBuilder('stat')
      .innerJoin('stat.user', 'user')
      .select([
        'user.id          AS id',
        'user.name        AS "displayName"',
        'stat.longestStreak        AS "longestStreak"',
        'stat.longestCorrectStreak AS "longestCorrectStreak"',
        'stat.totalCorrect         AS "totalCorrect"',
        'stat.totalPoints          AS "totalPoints"',
      ])
      .orderBy(orderBy.primary.field, orderBy.primary.direction)
      .addOrderBy(orderBy.secondary.field, orderBy.secondary.direction)
      .limit(10)
      .getRawMany<LeaderboardEntry>();

    // Current user rank
    let currentUser: (LeaderboardEntry & { rank: number }) | null = null;

    if (currentUserId) {
      const userStat = await this.userStatRepo
        .createQueryBuilder('stat')
        .innerJoin('stat.user', 'user')
        .select([
          'user.id          AS id',
          'user.name        AS "displayName"',
          'stat.longestStreak        AS "longestStreak"',
          'stat.longestCorrectStreak AS "longestCorrectStreak"',
          'stat.totalCorrect         AS "totalCorrect"',
          'stat.totalPoints          AS "totalPoints"',
        ])
        .where('stat.userId = :id', { id: currentUserId })
        .getRawOne<LeaderboardEntry>();

      if (userStat) {
        const betterUsersCount = await this.countBetterUsers(userStat, sortBy);
        currentUser = { ...userStat, rank: betterUsersCount + 1 };
      }
    }

    return successResponse('Leaderboard fetched successfully', {
      topUsers,
      currentUser,
    });
  }

  private resolveOrderBy(sortBy: SortBy) {
    const DIR = { DESC: 'DESC' as const };

    if (sortBy === SortBy.CORRECT) {
      return {
        primary: { field: 'stat.longestCorrectStreak', direction: DIR.DESC },
        secondary: { field: 'stat.totalCorrect', direction: DIR.DESC },
      };
    }

    if (sortBy === SortBy.DAILY) {
      return {
        primary: { field: 'stat.longestStreak', direction: DIR.DESC },
        secondary: { field: 'stat.totalCorrect', direction: DIR.DESC },
      };
    }

    return {
      primary: { field: 'stat.totalPoints', direction: DIR.DESC },
      secondary: { field: 'stat.longestStreak', direction: DIR.DESC },
    };
  }

  private async countBetterUsers(
    userStat: LeaderboardEntry,
    sortBy: SortBy,
  ): Promise<number> {
    const qb = this.userStatRepo.createQueryBuilder('stat');

    if (sortBy === SortBy.CORRECT) {
      qb.where(
        `stat.longestCorrectStreak > :streak
          OR (stat.longestCorrectStreak = :streak AND stat.totalCorrect > :correct)`,
        {
          streak: userStat.longestCorrectStreak,
          correct: userStat.totalCorrect,
        },
      );
    } else if (sortBy === SortBy.DAILY) {
      qb.where(
        `stat.longestStreak > :streak
          OR (stat.longestStreak = :streak AND stat.totalCorrect > :correct)`,
        { streak: userStat.longestStreak, correct: userStat.totalCorrect },
      );
    } else {
      qb.where(
        `stat.totalPoints > :points
          OR (stat.totalPoints = :points AND stat.longestStreak > :streak)`,
        { points: userStat.totalPoints, streak: userStat.longestStreak },
      );
    }

    return qb.getCount();
  }
}
