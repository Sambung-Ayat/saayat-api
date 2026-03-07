import { IsString, IsNotEmpty, IsOptional, IsNumber } from 'class-validator';

export class ValidateAnswerDto {
  @IsString()
  @IsNotEmpty()
  choiceKey: string;

  @IsString()
  @IsNotEmpty()
  challengeToken: string;

  @IsOptional()
  @IsNumber()
  sessionLimit?: number;
}