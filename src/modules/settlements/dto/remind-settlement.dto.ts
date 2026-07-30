import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsUUID, Min } from 'class-validator';

export class RemindSettlementDto {
  @ApiProperty()
  @IsUUID()
  groupId: string;

  @ApiProperty()
  @IsUUID()
  targetUserId: string;

  @ApiProperty()
  @IsNumber()
  @Min(0.01)
  amount: number;
}
