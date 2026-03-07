import { IsOptional, IsEnum } from 'class-validator';

export enum SortBy {
  POINTS = 'points',
  CORRECT = 'correct',
  DAILY = 'daily',
}

export class LeaderboardQueryDto {
  @IsOptional()
  @IsEnum(SortBy)
  sortBy?: SortBy;
}
