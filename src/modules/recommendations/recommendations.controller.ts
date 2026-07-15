import {
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { GroupRole } from '@prisma/client';
import { CurrentUser } from '../../shared/common/decorators/current-user.decorator';
import { RequireGroupRole } from '../groups/presentation/guards/group-role.decorator';
import { GroupRoleGuard } from '../groups/presentation/guards/group-role.guard';
import { GenerateRecommendationDto } from './dto/generate-recommendation.dto';
import { RecommendationsService } from './recommendations.service';

@ApiTags('recommendations')
@ApiBearerAuth()
@UseGuards(GroupRoleGuard)
@RequireGroupRole(GroupRole.MEMBER)
@Controller({ path: 'groups/:groupId/recommendations', version: '1' })
export class RecommendationsController {
  constructor(private readonly recommendationsService: RecommendationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get group recommendations' })
  async findAll(
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @CurrentUser('id') userId: string,
  ) {
    const recommendations = await this.recommendationsService.getGroupRecommendations(
      groupId,
      userId,
    );
    return { data: recommendations };
  }

  @Post('generate')
  @ApiOperation({ summary: 'Trigger recommendation generation' })
  generate(
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @Query() query: GenerateRecommendationDto,
    @CurrentUser('id') userId: string,
  ) {
    const type = query.type || 'activity';
    return this.recommendationsService.triggerRecommendationGeneration(groupId, type, userId);
  }

  @Post('budget-analysis')
  @ApiOperation({ summary: 'Trigger budget analysis' })
  budgetAnalysis(@Param('groupId', ParseUUIDPipe) groupId: string) {
    return this.recommendationsService.triggerBudgetAnalysis(groupId);
  }

  @Delete('batch/:batchId')
  @ApiOperation({ summary: 'Delete recommendations by batch ID' })
  deleteByBatch(
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @Param('batchId') batchId: string,
  ) {
    return this.recommendationsService.deleteByBatchId(groupId, batchId);
  }

  @Patch(':id/acted-on')
  @ApiOperation({ summary: 'Mark recommendation as acted on' })
  markActedOn(@Param('id', ParseUUIDPipe) id: string) {
    return this.recommendationsService.markActedOn(id);
  }

  @Post(':id/like')
  @ApiOperation({ summary: 'Like a recommendation' })
  like(@Param('id', ParseUUIDPipe) id: string, @CurrentUser('id') userId: string) {
    return this.recommendationsService.likeRecommendation(id, userId);
  }

  @Delete(':id/like')
  @ApiOperation({ summary: 'Unlike a recommendation' })
  unlike(@Param('id', ParseUUIDPipe) id: string, @CurrentUser('id') userId: string) {
    return this.recommendationsService.unlikeRecommendation(id, userId);
  }
}
