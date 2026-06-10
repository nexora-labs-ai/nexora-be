import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ItineraryService } from './itinerary.service';
import { CreateItineraryDto } from './dto/create-itinerary.dto';
import { CurrentUser } from '../../shared/common/decorators/current-user.decorator';

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
  ) {
    return this.itineraryService.createItinerary(groupId, dto);
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
