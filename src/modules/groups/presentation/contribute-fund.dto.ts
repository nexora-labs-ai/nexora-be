import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsPositive, IsString, IsUrl, MaxLength } from 'class-validator';

export class ContributeFundDto {
  @ApiProperty({ example: 500000, description: 'Amount to contribute' })
  @IsNumber()
  @IsPositive()
  amount: number;

  @ApiPropertyOptional({
    example: 'Monthly contribution',
    description: 'Note for the contribution',
  })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional({ example: 'https://res.cloudinary.com/.../receipt.jpg' })
  @IsOptional()
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @MaxLength(2048)
  evidenceUrl?: string;
}
