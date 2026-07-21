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
  userInput: string;

  @ApiProperty({
    description: 'Vị trí địa lý bắt buộc (VD: Quy Nhơn, Đà Lạt)',
    example: 'Quy Nhơn',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  location: string;
}
