import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';

export class ContributeFundDto {
  @ApiProperty({ example: 500000, description: 'Amount to contribute' })
  @IsNumber()
  @IsPositive()
  amount: number;

  @ApiPropertyOptional({
    example: 'Monthly contribution',
    description: 'Note for the contribution',
  })
  @IsOptional()
  @IsString()
  note?: string;
}
