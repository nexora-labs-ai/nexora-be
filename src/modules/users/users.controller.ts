import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../shared/common/decorators/current-user.decorator';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth()
@Controller({ path: 'users', version: '1' })
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  getMe(@CurrentUser('id') userId: string) {
    return this.usersService.getProfile(userId);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update current user profile' })
  updateMe(@CurrentUser('id') userId: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(userId, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  findOne(@Param('id') id: string) {
    return this.usersService.getProfile(id);
  }
}
