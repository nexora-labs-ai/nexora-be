import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';

export class WithdrawFundDto {
  @ApiProperty({ example: 200000, description: 'Amount to withdraw/refund' })
  @IsNumber()
  @IsPositive()
  amount: number;

  @ApiPropertyOptional({ example: 'Refund excess fund', description: 'Note for the withdrawal' })
  @IsOptional()
  @IsString()
  note?: string;
}
