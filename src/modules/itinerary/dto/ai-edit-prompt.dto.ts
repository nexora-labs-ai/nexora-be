import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class AiEditPromptDto {
  @ApiProperty({ description: 'The prompt to guide the AI modification' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  prompt: string;
}
