import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseFilePipeBuilder,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../shared/common/decorators/current-user.decorator';
import { CreateSettlementDto } from './dto/create-settlement.dto';
import { RemindSettlementDto } from './dto/remind-settlement.dto';
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

  @Get('optimized')
  @ApiOperation({ summary: 'Get optimized settlements (debt simplification)' })
  getOptimizedSettlements(
    @Query('groupId', ParseUUIDPipe) groupId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.settlementsService.getOptimizedSettlements(groupId, userId);
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

  @Post('remind')
  @ApiOperation({ summary: 'Remind a user to settle their debt' })
  remind(@CurrentUser('id') userId: string, @Body() dto: RemindSettlementDto) {
    return this.settlementsService.remindSettlement(
      dto.groupId,
      userId,
      dto.targetUserId,
      dto.amount,
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

  @Post(':id/evidence')
  @ApiOperation({ summary: 'Upload evidence for a settlement' })
  @UseInterceptors(FileInterceptor('file'))
  uploadEvidence(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({ fileType: /(jpg|jpeg|png|webp)$/ })
        .addMaxSizeValidator({ maxSize: 5 * 1024 * 1024 })
        .build({ errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY }),
    )
    file: Express.Multer.File,
    @CurrentUser('id') userId: string,
  ) {
    return this.settlementsService.uploadEvidence(id, file, userId);
  }
}
