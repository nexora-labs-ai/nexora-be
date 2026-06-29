import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class FundTransactionDto {
  @ApiProperty({ example: 'uuid', description: 'Transaction ID' })
  id: string;

  @ApiProperty({ example: 'uuid', description: 'Fund ID' })
  fundId: string;

  @ApiProperty({ example: 'uuid', description: 'User who made the transaction' })
  createdBy: string;

  @ApiPropertyOptional({ example: 'uuid', description: 'Related expense ID if type is EXPENSE' })
  expenseId?: string | null;

  @ApiProperty({ example: 'CONTRIBUTION', enum: ['CONTRIBUTION', 'EXPENSE', 'REFUND'] })
  type: string;

  @ApiProperty({ example: 500000, description: 'Amount transacted' })
  amount: number;

  @ApiPropertyOptional({ example: 'Monthly contribution', description: 'Note' })
  note?: string | null;

  @ApiProperty()
  createdAt: Date;
}

export class GroupFundResponseDto {
  @ApiProperty({ example: 'uuid' })
  id: string;

  @ApiProperty({ example: 'uuid' })
  groupId: string;

  @ApiProperty({ example: 1000000, description: 'Current fund balance' })
  balance: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class FundActionResponseDto {
  @ApiProperty({ type: GroupFundResponseDto })
  fund: GroupFundResponseDto;

  @ApiProperty({ type: FundTransactionDto })
  transaction: FundTransactionDto;
}
