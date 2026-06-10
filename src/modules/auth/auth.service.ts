import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { addDays } from 'date-fns';
import { AuthProvider } from '@prisma/client';
import { AuthRepository } from './auth.repository';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { ConflictError, UnauthorizedError } from '../../shared/common/domain-errors';
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

  constructor(
    private readonly authRepository: AuthRepository,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthTokens> {
    const existingUser = await this.usersService.findByEmail(dto.email);
    if (existingUser) {
      throw new ConflictError('Email already registered');
    }

    const existingUsername = await this.usersService.findByUsername(dto.username);
    if (existingUsername) {
      throw new ConflictError('Username already taken');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.usersService.create({
      email: dto.email,
      username: dto.username,
      displayName: dto.displayName,
      passwordHash,
      provider: AuthProvider.LOCAL,
    });

    return this.generateTokens(user.id, user.email, user.role);
  }

  async validateLocalUser(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user || !user.passwordHash) {
      throw new UnauthorizedError('Invalid credentials');
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedError('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedError('Account is disabled');
    }

    return user;
  }

  async login(userId: string, email: string, role: string): Promise<AuthTokens> {
    return this.generateTokens(userId, email, role);
  }

  async validateGoogleUser(payload: GoogleUserPayload) {
    let user = await this.usersService.findByEmail(payload.email);

    if (!user) {
      user = await this.usersService.create({
        email: payload.email,
        username: payload.email.split('@')[0] + '_' + uuidv4().slice(0, 6),
        displayName: payload.displayName,
        avatarUrl: payload.avatarUrl,
        provider: AuthProvider.GOOGLE,
        providerId: payload.providerId,
        isEmailVerified: true,
      });
    }

    return user;
  }

  async refreshTokens(token: string): Promise<AuthTokens> {
    const stored = await this.authRepository.findRefreshToken(token);

    if (!stored || stored.isRevoked || stored.expiresAt < new Date()) {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    // Rotate: revoke old, issue new
    await this.authRepository.revokeRefreshToken(token);
    return this.generateTokens(stored.user.id, stored.user.email, stored.user.role);
  }

  async logout(userId: string): Promise<void> {
    await this.authRepository.revokeAllUserTokens(userId);
  }

  private async generateTokens(
    userId: string,
    email: string,
    role: string,
  ): Promise<AuthTokens> {
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
