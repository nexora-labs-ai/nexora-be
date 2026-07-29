import { ApiPropertyOptional } from '@nestjs/swagger';
import { Currency } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { IsAfter } from '../../../shared/common/validators/is-after.validator';
import { IsBefore } from '../../../shared/common/validators/is-before.validator';

export class UpdateGroupDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ enum: Currency })
  @IsOptional()
  @IsEnum(Currency)
  currency?: Currency;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  @IsBefore('endDate')
  startDate?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  @IsAfter('startDate')
  endDate?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  budgetGoal?: number | null;
}
