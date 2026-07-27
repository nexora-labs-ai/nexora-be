import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsDateString, IsInt, IsNumber, IsOptional, IsString, IsUrl, Min } from 'class-validator';
import { IsAfter } from '../../../shared/common/validators/is-after.validator';
import { IsBefore } from '../../../shared/common/validators/is-before.validator';

export class CreateItineraryItemDto {
  @ApiProperty() @IsString() title: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() location?: string;
  @ApiProperty() @IsDateString() @IsBefore('endTime') startTime: string;
  @ApiProperty() @IsDateString() @IsAfter('startTime') endTime: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) estimatedCost?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) orderNo?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) travelTime?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() recommendationId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUrl() imageUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsUrl() googleMapsUrl?: string;
}

export class UpdateItineraryItemDto extends PartialType(CreateItineraryItemDto) {}
