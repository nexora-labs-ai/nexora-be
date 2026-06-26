import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AuthProvider, UserRole, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { addDays } from 'date-fns';
import { OAuth2Client } from 'google-auth-library';
import { v4 as uuidv4 } from 'uuid';
import { ConflictError, UnauthorizedError } from '../../shared/common/domain-errors';
import { UsersService } from '../users/users.service';
import { AuthRepository } from './auth.repository';
import { RegisterDto } from './dto/register.dto';
import { MezonAuthService, MezonUserInfo } from './mezon-auth.service';
import { JwtPayload } from './strategies/jwt.strategy';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface GoogleUserPayload {
  providerId: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

  constructor(
    private readonly authRepository: AuthRepository,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly mezonAuthService: MezonAuthService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthTokens> {
    const existingUser = await this.usersService.findByEmail(dto.email);
    if (existingUser) {
      throw new ConflictError('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.usersService.create({
      email: dto.email,
      displayName: dto.displayName,
      passwordHash,
      provider: AuthProvider.LOCAL,
    });

    return this.generateTokens(user.id, user.email!, user.role || UserRole.USER);
  }

  async validateLocalUser(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      this.logger.warn(`Login failed: User with email ${email} not found.`);
      throw new UnauthorizedError('Invalid credentials');
    }

    const localAccount = user.authAccounts.find((a) => a.provider === AuthProvider.LOCAL);
    if (!localAccount || !localAccount.passwordHash) {
      this.logger.warn(
        `Login failed: User ${email} does not have a local password set (might be Google login).`,
      );
      throw new UnauthorizedError('Invalid credentials');
    }

    const isValid = await bcrypt.compare(password, localAccount.passwordHash);
    if (!isValid) {
      this.logger.warn(`Login failed: Incorrect password provided for ${email}.`);
      throw new UnauthorizedError('Invalid credentials');
    }

    if (user.status !== UserStatus.ACTIVE) {
      this.logger.warn(`Login failed: Account for ${email} is disabled (Status: ${user.status}).`);
      throw new UnauthorizedError('Account is disabled');
    }

    this.logger.log(`User ${email} logged in successfully.`);
    return user;
  }

  async login(userId: string, email: string, role: string): Promise<AuthTokens> {
    return this.generateTokens(userId, email, role);
  }

  async validateGoogleUser(payload: GoogleUserPayload) {
    const user = await this.usersService.findByEmail(payload.email);

    if (!user) {
      return this.usersService.create({
        email: payload.email,
        displayName: payload.displayName,
        avatarUrl: payload.avatarUrl,
        provider: AuthProvider.GOOGLE,
        providerId: payload.providerId,
      });
    }

    return user;
  }

  async loginWithGoogleToken(idToken: string): Promise<AuthTokens> {
    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();
      if (!payload || !payload.email) {
        throw new UnauthorizedError('Invalid Google token');
      }

      const user = await this.validateGoogleUser({
        providerId: payload.sub,
        email: payload.email,
        displayName: payload.name || 'Google User',
        avatarUrl: payload.picture,
      });

      return this.generateTokens(user.id, user.email!, user.role || UserRole.USER);
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Google token verification failed: ${err.message}`, err.stack);
      throw new UnauthorizedError('Invalid Google token');
    }
  }

  /**
   * Orchestrator: Run the entire Mezon OAuth2 flow → Return system JWT
   */
  async loginWithMezon(code: string, redirectUri?: string): Promise<AuthTokens> {
    const resolvedRedirectUri =
      redirectUri ?? this.configService.get<string>('mezon.redirectUri') ?? '';

    if (!resolvedRedirectUri) {
      throw new UnauthorizedError(
        'redirect_uri is required. Provide it in request body or set MEZON_REDIRECT_URI env var.',
      );
    }

    const tokenResponse = await this.mezonAuthService.exchangeCodeForToken(
      code,
      resolvedRedirectUri,
    );

    const mezonUserInfo = await this.mezonAuthService.getMezonUserInfo(tokenResponse.access_token);

    const user = await this.validateMezonUser(mezonUserInfo);

    return this.login(user.id, user.email ?? '', user.role ?? UserRole.USER);
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
        return existingUser;
      }
    }

    // Not found → Create new user with MEZON provider
    const newUser = await this.usersService.create({
      email: mezonUser.email || `${mezonUser.sub}@mezon.auth`,
      displayName: mezonUser.name ?? 'Mezon User',
      avatarUrl: mezonUser.picture,
      provider: AuthProvider.MEZON,
      providerId: mezonUser.sub,
    });

    return newUser;
  }

  async refreshTokens(token: string): Promise<AuthTokens> {
    const stored = await this.authRepository.findRefreshToken(token);

    if (!stored || !stored.expiresAt || stored.expiresAt < new Date() || !stored.user) {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    // Rotate: revoke old, issue new
    await this.authRepository.revokeRefreshToken(token);
    return this.generateTokens(
      stored.user.id,
      stored.user.email || '',
      stored.user.role || UserRole.USER,
    );
  }

  async logout(userId: string): Promise<void> {
    await this.authRepository.revokeAllUserTokens(userId);
  }

  private async generateTokens(userId: string, email: string, role: string): Promise<AuthTokens> {
    const payload: JwtPayload = { sub: userId, email, role };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('jwt.accessSecret'),
      expiresIn: this.configService.get<string>('jwt.accessExpiresIn'),
    });

    const refreshToken = uuidv4();
    const expiresAt = addDays(new Date(), 7);

    await this.authRepository.createRefreshToken({
      token: refreshToken,
      userId,
      expiresAt,
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: 900, // 15 minutes
    };
  }
}
