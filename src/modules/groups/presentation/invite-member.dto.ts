import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class InviteMemberDto {
  @ApiProperty({ description: 'Email of the user to invite' })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}
