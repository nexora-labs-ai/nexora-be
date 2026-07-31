import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Currency, GroupRole } from '@prisma/client';
import { UserSummaryDto } from '../../../shared/common/dtos/user-summary.dto';

export class GroupMemberSummaryDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  groupId: string;

  @ApiProperty()
  userId: string;

  @ApiProperty({ enum: GroupRole })
  role: GroupRole;

  @ApiProperty()
  joinedAt: Date;

  @ApiProperty({ type: UserSummaryDto })
  user: UserSummaryDto;
}

export class GroupFundSummaryDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  groupId: string;

  @ApiProperty({
    type: String,
    example: '1500000.00',
    description: 'Decimal monetary value serialized as a string',
  })
  balance: string;
}

export class GroupSummaryResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  description: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  avatarUrl: string | null;

  @ApiProperty({ enum: Currency })
  currency: Currency;

  @ApiProperty()
  isActive: boolean;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  startDate: Date | null;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  endDate: Date | null;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    example: '5000000.00',
    description: 'Decimal monetary value serialized as a string',
  })
  budgetGoal: string | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  deletedAt: Date | null;

  @ApiProperty({ type: [GroupMemberSummaryDto] })
  members: GroupMemberSummaryDto[];

  @ApiPropertyOptional({
    type: GroupFundSummaryDto,
    nullable: true,
  })
  fund: GroupFundSummaryDto | null;

  @ApiProperty({
    type: String,
    example: '1250000.00',
    description: 'Total group-fund spending serialized as a decimal string',
  })
  totalSpent: string;
}
