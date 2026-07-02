import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsNumber, IsOptional, IsString } from 'class-validator';
import { CurrentUser } from '../../shared/common/decorators/current-user.decorator';
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
  @ApiOperation({ summary: 'Get group itineraries' })
  findAll(@Query('groupId', ParseUUIDPipe) groupId: string) {
    return this.itineraryService.getGroupItineraries(groupId);
  }

  @Post()
  @ApiOperation({ summary: 'Create an itinerary' })
  create(
    @Query('groupId', ParseUUIDPipe) groupId: string,
    @Body() dto: CreateItineraryDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.itineraryService.createItinerary(groupId, dto, userId);
  }

  @Post('generate')
  @ApiOperation({ summary: 'Generate AI itinerary' })
  generate(
    @Query('groupId', ParseUUIDPipe) groupId: string,
    @Body() dto: GenerateItineraryDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.itineraryService.generateAiItinerary(groupId, { ...dto, requestedBy: userId });
  }

  @Patch(':id/publish')
  @ApiOperation({ summary: 'Publish an itinerary' })
  publish(@Param('id', ParseUUIDPipe) id: string) {
    return this.itineraryService.publishItinerary(id);
  }
}
