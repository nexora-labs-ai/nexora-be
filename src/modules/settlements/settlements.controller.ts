import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../shared/common/decorators/current-user.decorator';
import { CreateSettlementDto } from './dto/create-settlement.dto';
import { SettlementsService } from './settlements.service';

@ApiTags('settlements')
@ApiBearerAuth()
@Controller({ path: 'settlements', version: '1' })
export class SettlementsController {
  constructor(private readonly settlementsService: SettlementsService) {}

  @Get()
  @ApiOperation({ summary: 'Get group settlements' })
  findGroupSettlements(
    @Query('groupId', ParseUUIDPipe) groupId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.settlementsService.getGroupSettlements(groupId, userId);
  }

  @Post()
  @ApiOperation({ summary: 'Request a settlement' })
  create(@CurrentUser('id') userId: string, @Body() dto: CreateSettlementDto) {
    return this.settlementsService.requestSettlement(
      dto.groupId,
      userId,
      dto.toUserId,
      dto.amount,
      dto.currency ?? 'USD',
      dto.note,
    );
  }

  @Patch(':id/complete')
  @ApiOperation({ summary: 'Mark settlement as completed' })
  complete(@Param('id', ParseUUIDPipe) id: string, @CurrentUser('id') userId: string) {
    return this.settlementsService.completeSettlement(id, userId);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancel a settlement' })
  cancel(@Param('id', ParseUUIDPipe) id: string, @CurrentUser('id') userId: string) {
    return this.settlementsService.cancelSettlement(id, userId);
  }
}
