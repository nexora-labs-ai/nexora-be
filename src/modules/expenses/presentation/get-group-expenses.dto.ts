import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../shared/common/dtos/pagination-query.dto';

export class GetGroupExpensesDto extends PaginationQueryDto {
  @ApiProperty()
  @IsUUID()
  groupId!: string;
}
