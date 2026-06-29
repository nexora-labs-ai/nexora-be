import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateItineraryItemDto {
  @ApiProperty() @IsString() title: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() location?: string;
  @ApiProperty() @IsDateString() startTime: string;
  @ApiProperty() @IsDateString() endTime: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() estimatedCost?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() orderNo?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class UpdateItineraryItemDto {
  @ApiPropertyOptional() @IsOptional() @IsString() title?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() location?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() startTime?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() endTime?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() estimatedCost?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() orderNo?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}
