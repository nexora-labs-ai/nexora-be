import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UserProfileDto {
  @ApiProperty()
  userId: string;

  @ApiPropertyOptional()
  displayName?: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  avatarUrl?: string | null;
}

export class UserSummaryDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  status: string;

  @ApiPropertyOptional({ type: UserProfileDto, nullable: true })
  profile?: UserProfileDto | null;
}
