import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsISO4217CurrencyCode,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { IsAfter } from '../../../shared/common/validators/is-after.validator';
import { IsBefore } from '../../../shared/common/validators/is-before.validator';

export class CreateGroupDto {
  @ApiProperty({ example: 'Bali Trip 2025' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ example: 'Group for Bali trip expenses' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ example: 'USD', default: 'USD' })
  @IsOptional()
  @IsISO4217CurrencyCode()
  currency?: string;

  @ApiPropertyOptional({ example: '2026-12-01T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  @IsBefore('endDate')
  startDate?: string;

  @ApiPropertyOptional({ example: '2026-12-15T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  @IsAfter('startDate')
  endDate?: string;

  @ApiPropertyOptional({ example: 1000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  budgetGoal?: number;
}
