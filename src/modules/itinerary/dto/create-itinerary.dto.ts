import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { IsAfter } from '../../../shared/common/validators/is-after.validator';
import { IsBefore } from '../../../shared/common/validators/is-before.validator';

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

  @ApiPropertyOptional({ example: '2026-12-01' })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'startDate must use YYYY-MM-DD format' })
  @IsBefore('endDate')
  startDate?: string;

  @ApiPropertyOptional({ example: '2026-12-05' })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'endDate must use YYYY-MM-DD format' })
  @IsAfter('startDate')
  endDate?: string;

  @ApiPropertyOptional({ example: 'Bali, Indonesia' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  destination?: string;
}
