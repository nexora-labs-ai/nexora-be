import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class GenerateRecommendationDto {
  @ApiPropertyOptional({ description: 'Type of recommendation to generate', default: 'activity' })
  @IsOptional()
  @IsString()
  type?: string;
}
