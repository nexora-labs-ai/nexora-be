import { ApiProperty } from '@nestjs/swagger';

export class UserProfileDto {
  @ApiProperty()
  userId: string;

  @ApiProperty()
  displayName: string;

  @ApiProperty({ type: String, nullable: true })
  avatarUrl: string | null;
}

export class UserSummaryDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  status: string;

  @ApiProperty({ type: UserProfileDto, nullable: true })
  profile: UserProfileDto | null;
}
