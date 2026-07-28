import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UserProfileDto {
  @ApiProperty()
  userId: string;

  @ApiPropertyOptional()
  displayName?: string;

  @ApiPropertyOptional()
  avatarUrl?: string;
}

export class UserSummaryDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  status: string;

  @ApiPropertyOptional({ type: UserProfileDto })
  profile?: UserProfileDto;
}
