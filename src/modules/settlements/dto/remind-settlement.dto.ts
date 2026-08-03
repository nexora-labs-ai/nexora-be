import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class RemindSettlementDto {
  @ApiProperty()
  @IsUUID()
  groupId: string;

  @ApiProperty()
  @IsUUID()
  targetUserId: string;
}
