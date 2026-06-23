import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthProvider, UserRole } from '@prisma/client';
import { UnauthorizedError } from '../../shared/common/domain-errors';
import { UsersService } from '../users/users.service';

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
  ) {}

  /**
   * Step 1: Exchange Authorization Code for Access Token from Mezon
   * Mezon requires Content-Type: application/x-www-form-urlencoded (DO NOT use JSON)
   */
  async exchangeCodeForToken(code: string, redirectUri: string): Promise<MezonTokenResponse> {
    const tokenUrl = this.configService.get<string>('mezon.tokenUrl')!;
    const clientId = this.configService.get<string>('mezon.clientId');
    const clientSecret = this.configService.get<string>('mezon.clientSecret');

    if (!clientId || !clientSecret) {
      throw new UnauthorizedError('Mezon OAuth2 is not configured on this server');
    }

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
   * Step 2: Fetch user info from Mezon using Access Token
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
   * Step 3: Find or create user in DB based on Mezon info
   * Pattern: Find by email first, if not found then create new with AuthProvider.MEZON
   */
  async validateMezonUser(mezonUser: MezonUserInfo) {
    // If email exists, try to find current user (prevent duplicates with Google/Local accounts)
    if (mezonUser.email) {
      const existingUser = await this.usersService.findByEmail(mezonUser.email);
      if (existingUser) {
        this.logger.log(
          `Mezon login: Found existing user by email ${mezonUser.email}, userId: ${existingUser.id}`,
        );
        return existingUser;
      }
    }

    // Not found → Create new user with MEZON provider

    const newUser = await this.usersService.create({
      email: mezonUser.email ?? undefined,
      displayName: mezonUser.name ?? 'Mezon User',
      avatarUrl: mezonUser.picture,
      provider: AuthProvider.MEZON,
      providerId: mezonUser.sub,
    });

    return newUser;
  }
}
