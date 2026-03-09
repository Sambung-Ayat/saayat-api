import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class UpdateDisplayNameDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  displayName: string;
}
