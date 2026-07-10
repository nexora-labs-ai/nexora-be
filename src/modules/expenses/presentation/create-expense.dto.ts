import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ExpenseSplitType, FundingSource } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsISO4217CurrencyCode,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class SplitParticipantDto {
  @ApiProperty()
  @IsUUID()
  userId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(1)
  shares?: number;
}

export class CreateExpenseDto {
  @ApiProperty()
  @IsUUID()
  groupId: string;

  @ApiProperty({ example: 'Dinner at rooftop' })
  @IsString()
  @MaxLength(200)
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiProperty({ example: 120.5 })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiPropertyOptional({ example: 'USD' })
  @IsOptional()
  @IsISO4217CurrencyCode()
  currency?: string;

  @ApiProperty({ enum: ExpenseSplitType, example: ExpenseSplitType.SHARES })
  @IsEnum(ExpenseSplitType)
  splitType: ExpenseSplitType;

  @ApiProperty({ enum: FundingSource, example: FundingSource.PERSONAL })
  @IsEnum(FundingSource)
  fundingSource: FundingSource;

  @ApiProperty()
  @IsUUID()
  categoryId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional({ type: [SplitParticipantDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SplitParticipantDto)
  splits?: SplitParticipantDto[];
}
