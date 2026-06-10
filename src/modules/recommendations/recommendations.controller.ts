import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Patch,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { RecommendationsService } from './recommendations.service';

@ApiTags('recommendations')
@ApiBearerAuth()
@Controller({ path: 'recommendations', version: '1' })
export class RecommendationsController {
  constructor(private readonly recommendationsService: RecommendationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get group recommendations' })
  findAll(@Query('groupId', ParseUUIDPipe) groupId: string) {
    return this.recommendationsService.getGroupRecommendations(groupId);
  }

  @Post('generate')
  @ApiOperation({ summary: 'Trigger recommendation generation' })
  generate(
    @Query('groupId', ParseUUIDPipe) groupId: string,
    @Query('type') type: string = 'activity',
  ) {
    return this.recommendationsService.triggerRecommendationGeneration(groupId, type);
  }

  @Post('budget-analysis')
  @ApiOperation({ summary: 'Trigger budget analysis' })
  budgetAnalysis(@Query('groupId', ParseUUIDPipe) groupId: string) {
    return this.recommendationsService.triggerBudgetAnalysis(groupId);
  }

  @Patch(':id/acted-on')
  @ApiOperation({ summary: 'Mark recommendation as acted on' })
  markActedOn(@Param('id', ParseUUIDPipe) id: string) {
    return this.recommendationsService.markActedOn(id);
  }
}
