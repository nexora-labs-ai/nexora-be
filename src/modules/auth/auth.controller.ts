import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
  Version,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { Public } from '../../shared/common/decorators/auth.decorators';
import { CurrentUser } from '../../shared/common/decorators/current-user.decorator';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';

@ApiTags('auth')
@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @Throttle({ strict: { ttl: 60000, limit: 5 } })
  @ApiOperation({ summary: 'Register a new user' })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ strict: { ttl: 60000, limit: 10 } })
  @UseGuards(AuthGuard('local'))
  @ApiOperation({ summary: 'Login with email and password' })
  login(@Req() req: Request & { user: { id: string; email: string; role: string } }) {
    return this.authService.login(req.user.id, req.user.email, req.user.role);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Throttle({ strict: { ttl: 60000, limit: 20 } })
  @ApiOperation({ summary: 'Refresh access token' })
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshTokens(dto.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Logout and revoke all tokens' })
  logout(@CurrentUser('id') userId: string) {
    return this.authService.logout(userId);
  }

  @Public()
  @Get('google')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Initiate Google OAuth2 login' })
  googleAuth() {
    // Redirected by Passport
  }

  @Public()
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Google OAuth2 callback' })
  googleCallback(@Req() req: Request & { user: { id: string; email: string; role: string } }) {
    return this.authService.login(req.user.id, req.user.email, req.user.role);
  }
}
