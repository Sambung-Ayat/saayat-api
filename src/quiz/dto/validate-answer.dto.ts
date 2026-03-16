import { IsString, IsNumber, IsOptional } from 'class-validator';

export class ValidateAnswerDto {
  @IsString()
  choiceKey: string;

  @IsString()
  challengeToken: string;

  @IsOptional()
  @IsNumber()
  sessionLimit?: number;
}
