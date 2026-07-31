import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class MezonLoginDto {
  @ApiProperty({
    description: 'Authorization code nhận từ Mezon OAuth2 callback',
    example: 'ory_ac_lidWCbmSJsJGZvw34jbRPfNj0eXJBq-kyxlwwcidryY.abc123',
  })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiPropertyOptional({
    description:
      'Redirect URI đã dùng khi tạo authorization URL. Nếu không truyền, sẽ lấy từ config MEZON_REDIRECT_URI',
    example: 'com.nexora.app://oauth/callback',
  })
  @IsOptional()
  @IsString()
  redirectUri?: string;
}
