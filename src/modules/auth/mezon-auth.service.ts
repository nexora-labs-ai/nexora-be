import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthProvider, UserRole } from '@prisma/client';
import { UnauthorizedError } from '../../shared/common/domain-errors';
import { UsersService } from '../users/users.service';
import { AuthService, AuthTokens } from './auth.service';

export interface MezonTokenResponse {
  access_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
}

export interface MezonUserInfo {
  sub: string; // Mezon user ID (unique identifier)
  email?: string; // Email (may be absent for some accounts)
  name?: string; // Display name
  picture?: string; // Avatar URL
}

@Injectable()
export class MezonAuthService {
  private readonly logger = new Logger(MezonAuthService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
    private readonly authService: AuthService,
  ) {}

  /**
   * Bước 1: Đổi Authorization Code lấy Access Token từ Mezon
   * Mezon yêu cầu Content-Type: application/x-www-form-urlencoded (KHÔNG dùng JSON)
   */
  async exchangeCodeForToken(code: string, redirectUri: string): Promise<MezonTokenResponse> {
    const tokenUrl = this.configService.get<string>('mezon.tokenUrl')!;
    const clientId = this.configService.get<string>('mezon.clientId');
    const clientSecret = this.configService.get<string>('mezon.clientSecret');

    if (!clientId || !clientSecret) {
      throw new UnauthorizedError('Mezon OAuth2 is not configured on this server');
    }

    this.logger.debug(`[DEBUG] Client ID: '${clientId}'`);
    this.logger.debug(`[DEBUG] Client Secret: '${clientSecret}'`);
    this.logger.debug(`[DEBUG] Redirect URI: '${redirectUri}'`);

    this.logger.log('Exchanging Mezon authorization code for access token');

    // Mezon ONLY accepts application/x-www-form-urlencoded, NOT JSON
    // Note: This client is registered with client_secret_post
    const formData = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      client_secret: clientSecret,
    });

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      this.logger.error(`Mezon token exchange failed: ${response.status} — ${errorBody}`);
      throw new UnauthorizedError('Failed to exchange Mezon authorization code');
    }

    const tokenData = (await response.json()) as MezonTokenResponse;
    this.logger.log('Successfully obtained Mezon access token');

    return tokenData;
  }

  /**
   * Bước 2: Lấy thông tin user từ Mezon bằng Access Token
   */
  async getMezonUserInfo(mezonAccessToken: string): Promise<MezonUserInfo> {
    const userInfoUrl = this.configService.get<string>('mezon.userInfoUrl')!;

    this.logger.log('Fetching user info from Mezon userinfo endpoint');

    const response = await fetch(userInfoUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${mezonAccessToken}`,
      },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      this.logger.error(`Mezon userinfo fetch failed: ${response.status} — ${errorBody}`);
      throw new UnauthorizedError('Failed to fetch user info from Mezon');
    }

    const userInfo = (await response.json()) as MezonUserInfo;

    if (!userInfo.sub) {
      this.logger.error('Mezon userinfo response missing required field: sub');
      throw new UnauthorizedError('Invalid user info received from Mezon');
    }

    this.logger.log(`Successfully fetched Mezon user info for sub: ${userInfo.sub}`);

    return userInfo;
  }

  /**
   * Bước 3: Tìm hoặc tạo user trong DB dựa trên thông tin Mezon
   * Pattern: Tìm qua email trước, nếu chưa có thì tạo mới với AuthProvider.MEZON
   */
  async validateMezonUser(mezonUser: MezonUserInfo) {
    // Nếu có email, thử tìm user hiện tại (tránh tạo trùng với tài khoản Google/Local)
    if (mezonUser.email) {
      const existingUser = await this.usersService.findByEmail(mezonUser.email);
      if (existingUser) {
        this.logger.log(
          `Mezon login: Found existing user by email ${mezonUser.email}, userId: ${existingUser.id}`,
        );
        return existingUser;
      }
    }

    // Chưa tìm thấy → Tạo user mới với provider MEZON
    this.logger.log(
      `Mezon login: No existing user found, creating new account for Mezon sub: ${mezonUser.sub}`,
    );

    const newUser = await this.usersService.create({
      email: mezonUser.email ?? undefined,
      displayName: mezonUser.name ?? 'Mezon User',
      avatarUrl: mezonUser.picture,
      provider: AuthProvider.MEZON,
      providerId: mezonUser.sub,
    });

    this.logger.log(`Mezon login: Created new user with id: ${newUser.id}`);

    return newUser;
  }

  /**
   * Orchestrator: Chạy toàn bộ luồng Mezon OAuth2 → Trả về JWT của hệ thống
   */
  async loginWithMezon(code: string, redirectUri?: string): Promise<AuthTokens> {
    // Lấy redirectUri từ config nếu Flutter không truyền lên
    const resolvedRedirectUri =
      redirectUri ?? this.configService.get<string>('mezon.redirectUri') ?? '';

    if (!resolvedRedirectUri) {
      throw new UnauthorizedError(
        'redirect_uri is required. Provide it in request body or set MEZON_REDIRECT_URI env var.',
      );
    }

    // Bước 1: Đổi code lấy Mezon access token
    const tokenResponse = await this.exchangeCodeForToken(code, resolvedRedirectUri);

    // Bước 2: Lấy thông tin user từ Mezon
    const mezonUserInfo = await this.getMezonUserInfo(tokenResponse.access_token);

    // Bước 3: Tìm hoặc tạo user trong DB
    const user = await this.validateMezonUser(mezonUserInfo);

    // Bước 4: Tạo JWT của hệ thống (tái sử dụng AuthService.login)
    return this.authService.login(user.id, user.email ?? '', user.role ?? UserRole.USER);
  }
}
