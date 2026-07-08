import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsDateString, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { IsBefore } from '../../../shared/common/validators/is-before.validator';

export class CreateItineraryItemDto {
  @ApiProperty() @IsString() title: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() location?: string;
  @ApiProperty() @IsDateString() @IsBefore('endTime') startTime: string;
  @ApiProperty() @IsDateString() endTime: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) estimatedCost?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) orderNo?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) travelTime?: number;
}

export class UpdateItineraryItemDto extends PartialType(CreateItineraryItemDto) {}
