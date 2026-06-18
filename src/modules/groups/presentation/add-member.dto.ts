import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';

export class AddMemberDto {
  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  userId: string;
}
