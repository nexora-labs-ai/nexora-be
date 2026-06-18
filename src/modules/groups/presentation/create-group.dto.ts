import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsISO4217CurrencyCode, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

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
}
