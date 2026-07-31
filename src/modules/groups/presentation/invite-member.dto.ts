import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, MaxLength } from 'class-validator';
import { IsEmailOrUsername } from '../../../shared/common/validators/is-email-or-username.validator';

export class InviteMemberDto {
  @ApiProperty({ description: 'Email or Username of the user to invite' })
  @IsNotEmpty()
  @IsEmailOrUsername()
  @MaxLength(255)
  identifier: string;
}
