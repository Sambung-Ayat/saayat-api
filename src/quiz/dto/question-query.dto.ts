import { IsOptional, IsIn, IsString } from 'class-validator';

export class QuestionQueryDto {
  @IsOptional()
  @IsString()
  juz?: string;

  @IsOptional()
  @IsString()
  surah?: string;

  @IsOptional()
  @IsIn(['id', 'en'])
  lang?: 'id' | 'en';
}
