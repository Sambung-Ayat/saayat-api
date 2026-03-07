import { Module } from '@nestjs/common';
import { DatabaseModule } from '@/database/database.module';
import { LeaderboardController } from '@/leaderboard/leaderboard.controller';
import { LeaderboardService } from '@/leaderboard/leaderboard.service';
import { leaderboardProviders } from '@/leaderboard/leaderboard.provider';

@Module({
  imports: [DatabaseModule],
  controllers: [LeaderboardController],
  providers: [...leaderboardProviders, LeaderboardService],
})
export class LeaderboardModule {}
