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
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiProperty,
  ApiPropertyOptional,
  ApiTags,
} from '@nestjs/swagger';
import { GroupRole } from '@prisma/client';
import { IsArray, IsNumber, IsOptional, IsString } from 'class-validator';
import { CurrentUser } from '../../shared/common/decorators/current-user.decorator';
import { RequireGroupRole } from '../groups/presentation/guards/group-role.decorator';
import { GroupRoleGuard } from '../groups/presentation/guards/group-role.guard';
import { AiEditPromptDto } from './dto/ai-edit-prompt.dto';
import { CreateItineraryDto } from './dto/create-itinerary.dto';
import { ItineraryService } from './itinerary.service';

class GenerateItineraryDto {
  @ApiProperty() @IsString() destination: string;
  @ApiProperty() @IsNumber() duration: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() budget?: number;
  @ApiPropertyOptional() @IsOptional() @IsArray() interests?: string[];
}

@ApiTags('itinerary')
@ApiBearerAuth()
@Controller({ path: 'itinerary', version: '1' })
export class ItineraryController {
  constructor(private readonly itineraryService: ItineraryService) {}

  @Get()
  @UseGuards(GroupRoleGuard)
  @RequireGroupRole(GroupRole.MEMBER)
  @ApiOperation({ summary: 'Get group itineraries' })
  findAll(@Query('groupId', ParseUUIDPipe) groupId: string) {
    return this.itineraryService.getGroupItineraries(groupId);
  }

  @Post()
  @UseGuards(GroupRoleGuard)
  @RequireGroupRole(GroupRole.MEMBER)
  @ApiOperation({ summary: 'Create an itinerary' })
  create(
    @Query('groupId', ParseUUIDPipe) groupId: string,
    @Body() dto: CreateItineraryDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.itineraryService.createItinerary(groupId, userId, dto);
  }

  @Post('generate')
  @UseGuards(GroupRoleGuard)
  @RequireGroupRole(GroupRole.MEMBER)
  @ApiOperation({ summary: 'Generate AI itinerary' })
  generate(
    @Query('groupId', ParseUUIDPipe) groupId: string,
    @Body() dto: GenerateItineraryDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.itineraryService.generateAiItinerary(groupId, { ...dto, requestedBy: userId });
  }

  @Post(':id/ai-edit')
  @ApiOperation({ summary: 'Edit entire itinerary using AI' })
  aiEditEntireItinerary(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AiEditPromptDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.itineraryService.aiEditEntireItinerary(id, dto.prompt, userId);
  }

  @Patch(':id/publish')
  @ApiOperation({ summary: 'Publish an itinerary' })
  publish(@Param('id', ParseUUIDPipe) id: string, @CurrentUser('id') userId: string) {
    return this.itineraryService.publishItinerary(id, userId);
  }
}
