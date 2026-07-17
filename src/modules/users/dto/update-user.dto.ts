import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsPhoneNumber, IsString, IsUrl, Matches, MaxLength } from 'class-validator';
import {
  USERNAME_INVALID_MESSAGE,
  USERNAME_REGEX,
} from '../../../shared/common/validators/validation.constants';

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'John Doe' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  displayName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  @MaxLength(2048)
  avatarUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(USERNAME_REGEX, {
    message: USERNAME_INVALID_MESSAGE,
  })
  username?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsPhoneNumber()
  @MaxLength(20)
  phone?: string;
}
