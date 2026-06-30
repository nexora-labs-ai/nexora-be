import { Injectable } from '@nestjs/common';
import { AuthProvider, UserRole, UserStatus } from '@prisma/client';
import { PrismaService } from '../../shared/database/prisma.service';

export interface CreateUserData {
  email: string;
  displayName: string;
  passwordHash?: string;
  avatarUrl?: string;
  provider: AuthProvider;
  providerId?: string;
}

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id, deletedAt: null },
      include: {
        profile: true,
        authAccounts: true,
      },
    });
  }

  async findByEmail(email: string) {
    return this.prisma.user.findFirst({
      where: { email, deletedAt: null },
      include: {
        profile: true,
        authAccounts: true,
      },
    });
  }

  async findByProvider(provider: AuthProvider, providerId: string) {
    return this.prisma.user.findFirst({
      where: {
        deletedAt: null,
        authAccounts: {
          some: { provider, providerUserId: providerId },
        },
      },
      include: {
        profile: true,
        authAccounts: true,
      },
    });
  }

  async linkAuthAccount(userId: string, provider: AuthProvider, providerId: string) {
    return this.prisma.userAuthAccount.create({
      data: {
        userId,
        provider,
        providerUserId: providerId,
      },
    });
  }

  async create(data: CreateUserData) {
    return this.prisma.user.create({
      data: {
        email: data.email,
        role: UserRole.USER,
        status: UserStatus.ACTIVE,
        profile: {
          create: {
            displayName: data.displayName,
            avatarUrl: data.avatarUrl,
          },
        },
        authAccounts: {
          create: {
            provider: data.provider,
            providerUserId: data.providerId,
            passwordHash: data.passwordHash,
          },
        },
      },
      include: {
        profile: true,
        authAccounts: true,
      },
    });
  }

  async update(id: string, data: Partial<{ displayName: string; avatarUrl: string }>) {
    return this.prisma.userProfile.update({
      where: { userId: id },
      data: {
        displayName: data.displayName,
        avatarUrl: data.avatarUrl,
      },
    });
  }

  async softDelete(id: string) {
    return this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date(), status: UserStatus.DELETED },
    });
  }
}
