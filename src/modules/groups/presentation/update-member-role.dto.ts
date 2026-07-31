import { ApiProperty } from '@nestjs/swagger';
import { GroupRole } from '@prisma/client';
import { IsEnum, IsNotEmpty } from 'class-validator';

export class UpdateMemberRoleDto {
  @ApiProperty({ enum: GroupRole })
  @IsNotEmpty()
  @IsEnum(GroupRole)
  role: GroupRole;
}
