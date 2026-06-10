import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SettlementsService } from './settlements.service';
import { CreateSettlementDto } from './dto/create-settlement.dto';
import { CurrentUser } from '../../shared/common/decorators/current-user.decorator';

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
  create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateSettlementDto,
  ) {
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
  complete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.settlementsService.completeSettlement(id, userId);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancel a settlement' })
  cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.settlementsService.cancelSettlement(id, userId);
  }
}
