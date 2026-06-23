import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
  Version,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { Public } from '../../shared/common/decorators/auth.decorators';
import { CurrentUser } from '../../shared/common/decorators/current-user.decorator';
import { AuthService } from './auth.service';
import { GoogleTokenDto } from './dto/google-token.dto';
import { LoginDto } from './dto/login.dto';
import { MezonLoginDto } from './dto/mezon-login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import { MezonAuthService } from './mezon-auth.service';

@ApiTags('auth')
@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly mezonAuthService: MezonAuthService,
  ) {}

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
  login(
    @Body() dto: LoginDto,
    @Req() req: Request & { user: { id: string; email: string; role: string } },
  ) {
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
  @Post('mezon')
  @HttpCode(HttpStatus.OK)
  @Throttle({ strict: { ttl: 60000, limit: 10 } })
  @ApiOperation({ summary: 'Login with Mezon OAuth2 (Authorization Code Flow)' })
  @ApiResponse({ status: 200, description: 'Returns accessToken and refreshToken' })
  @ApiResponse({ status: 401, description: 'Invalid or expired authorization code' })
  mezonLogin(@Body() dto: MezonLoginDto) {
    return this.mezonAuthService.loginWithMezon(dto.code, dto.redirectUri);
  }

  // Mồi nhử: Nhận redirect từ Mezon (HTTPS) rồi đá sang Custom Scheme của App (app://)
  @Public()
  @Get('mezon/callback')
  @ApiOperation({ summary: 'Proxy redirect for Mezon OAuth2 to Flutter App' })
  mezonCallbackProxy(@Query('code') code: string, @Res() res: Response) {
    if (!code) {
      return res.status(HttpStatus.BAD_REQUEST).send('Authorization code is missing');
    }
    // Redirect thẳng về Custom Scheme của app kèm theo code
    const flutterAppDeepLink = `com.nexora.app://oauth/callback?code=${code}`;
    return res.redirect(flutterAppDeepLink);
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

  @Public()
  @Post('google/token')
  @HttpCode(HttpStatus.OK)
  @Throttle({ strict: { ttl: 60000, limit: 10 } })
  @ApiOperation({ summary: 'Login with Google ID Token from mobile app' })
  googleTokenLogin(@Body() dto: GoogleTokenDto) {
    return this.authService.loginWithGoogleToken(dto.idToken);
  }
}
