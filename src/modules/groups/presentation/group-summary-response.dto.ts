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

  @ApiPropertyOptional({ type: UserSummaryDto })
  user?: UserSummaryDto;
}

export class GroupFundSummaryDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  groupId: string;

  @ApiProperty()
  balance: number;
}

export class GroupSummaryResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiPropertyOptional()
  avatarUrl?: string;

  @ApiProperty({ enum: Currency })
  currency: Currency;

  @ApiProperty()
  isActive: boolean;

  @ApiPropertyOptional()
  startDate?: Date;

  @ApiPropertyOptional()
  endDate?: Date;

  @ApiPropertyOptional()
  budgetGoal?: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiPropertyOptional()
  deletedAt?: Date;

  @ApiProperty({ type: [GroupMemberSummaryDto] })
  members: GroupMemberSummaryDto[];

  @ApiPropertyOptional({ type: GroupFundSummaryDto })
  fund?: GroupFundSummaryDto;

  @ApiPropertyOptional({ type: String })
  totalSpent?: string;
}
