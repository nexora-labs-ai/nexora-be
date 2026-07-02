import { Body, Controller, Delete, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../shared/common/decorators/current-user.decorator';
import { AiEditPromptDto } from './dto/ai-edit-prompt.dto';
import { CreateItineraryItemDto, UpdateItineraryItemDto } from './dto/itinerary-item.dto';
import { ItineraryService } from './itinerary.service';

@ApiTags('itinerary-items')
@ApiBearerAuth()
@Controller({ path: 'itinerary/:itineraryId/items', version: '1' })
export class ItineraryItemController {
  constructor(private readonly itineraryService: ItineraryService) {}

  @Post()
  @ApiOperation({ summary: 'Add an item to itinerary' })
  createItem(
    @Param('itineraryId', ParseUUIDPipe) itineraryId: string,
    @Body() dto: CreateItineraryItemDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.itineraryService.createItineraryItem(itineraryId, dto, userId);
  }

  @Patch(':itemId')
  @ApiOperation({ summary: 'Update an itinerary item and auto-shift time' })
  updateItem(
    @Param('itineraryId', ParseUUIDPipe) itineraryId: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: UpdateItineraryItemDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.itineraryService.updateItineraryItem(itineraryId, itemId, dto, userId);
  }

  @Delete(':itemId')
  @ApiOperation({ summary: 'Delete an itinerary item' })
  deleteItem(
    @Param('itineraryId', ParseUUIDPipe) itineraryId: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.itineraryService.deleteItineraryItem(itineraryId, itemId, userId);
  }

  @Post(':itemId/ai-edit')
  @ApiOperation({ summary: 'Edit an itinerary item using AI' })
  aiEditItem(
    @Param('itineraryId', ParseUUIDPipe) itineraryId: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: AiEditPromptDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.itineraryService.aiEditItineraryItem(itineraryId, itemId, dto.prompt, userId);
  }
}
