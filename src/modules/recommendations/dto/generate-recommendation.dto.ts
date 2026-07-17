import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class GenerateRecommendationDto {
  @ApiProperty({
    description: 'Nội dung tìm kiếm (VD: Quán ốc, Lẩu Thái)',
    example: 'Quán ốc ngon rẻ',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  type: string;
}
