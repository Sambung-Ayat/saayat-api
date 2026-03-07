import { Controller, Get, Query } from '@nestjs/common';
import {
  AllowAnonymous,
  Session,
  UserSession,
} from '@thallesp/nestjs-better-auth';
import { LeaderboardService } from '@/leaderboard/leaderboard.service';
import { LeaderboardQueryDto } from '@/leaderboard/dto/leaderboard-query.dto';

@Controller('leaderboard')
export class LeaderboardController {
  constructor(private readonly leaderboardService: LeaderboardService) {}

  @Get()
  @AllowAnonymous()
  getLeaderboard(
    @Query() query: LeaderboardQueryDto,
    @Session() session: UserSession,
  ) {
    return this.leaderboardService.getLeaderboard(
      query.sortBy,
      session?.user?.id ?? null,
    );
  }
}
