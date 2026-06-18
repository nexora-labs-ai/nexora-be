import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateItineraryDto {
  @ApiProperty({ example: 'Bali Adventure 5 Days' })
  @IsString()
  @MaxLength(200)
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ example: 'Bali, Indonesia' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  destination?: string;
}
