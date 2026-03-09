import { IsString, IsNotEmpty, IsOptional, IsInt, Min } from 'class-validator';

export class ValidateAnswerDto {
  @IsString()
  @IsNotEmpty()
  choiceKey: string;

  @IsString()
  @IsNotEmpty()
  challengeToken: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  sessionLimit?: number;
}
