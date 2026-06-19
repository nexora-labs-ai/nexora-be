import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class GoogleTokenDto {
  @ApiProperty({ description: 'ID token from Google Sign In on mobile' })
  @IsString()
  @IsNotEmpty()
  idToken: string;
}
