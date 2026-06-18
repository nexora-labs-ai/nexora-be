import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsISO4217CurrencyCode,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateSettlementDto {
  @ApiProperty()
  @IsUUID()
  groupId: string;

  @ApiProperty()
  @IsUUID()
  toUserId: string;

  @ApiProperty()
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiPropertyOptional({ default: 'USD' })
  @IsOptional()
  @IsISO4217CurrencyCode()
  currency?: string = 'USD';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
