import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';

@Injectable()
export class AuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findRefreshToken(token: string) {
    return this.prisma.refreshToken.findFirst({
      where: { token },
      include: { user: true },
    });
  }

  async createRefreshToken(data: {
    token: string;
    userId: string;
    expiresAt: Date;
  }) {
    return this.prisma.refreshToken.create({ data });
  }

  async revokeRefreshToken(token: string) {
    return this.prisma.refreshToken.deleteMany({
      where: { token },
    });
  }

  async revokeAllUserTokens(userId: string) {
    return this.prisma.refreshToken.deleteMany({
      where: { userId },
    });
  }

  async deleteExpiredTokens() {
    return this.prisma.refreshToken.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
  }
}
