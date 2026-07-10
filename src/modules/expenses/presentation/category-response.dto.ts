import { ApiProperty } from '@nestjs/swagger';

export class CategoryResponseDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Category ID (UUID)',
  })
  id: string;

  @ApiProperty({ example: 'Food & Beverage', description: 'Category name' })
  name: string;

  @ApiProperty({ example: 'restaurant-outline', description: 'Icon identifier' })
  icon: string;

  @ApiProperty({ example: '#FF5733', description: 'Color code (HEX)' })
  color: string;

  @ApiProperty({ example: true, description: 'Is default category' })
  isDefault: boolean;

  @ApiProperty({ example: '2024-06-26T00:00:00Z' })
  createdAt: Date;
}
