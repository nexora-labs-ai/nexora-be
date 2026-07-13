import { Injectable } from '@nestjs/common';
import { AuthProvider, UserRole, UserStatus } from '@prisma/client';
import { PrismaService } from '../../shared/database/prisma.service';

export interface CreateUserData {
  email: string;
  username?: string;
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

  async findByUsername(username: string) {
    return this.prisma.user.findFirst({
      where: { username, deletedAt: null },
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
    return this.prisma.userAuthAccount.upsert({
      where: {
        provider_providerUserId: {
          provider,
          providerUserId: providerId,
        },
      },
      create: {
        userId,
        provider,
        providerUserId: providerId,
      },
      update: {},
    });
  }

  async create(data: CreateUserData) {
    return this.prisma.user.create({
      data: {
        email: data.email,
        username: data.username,
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

  async update(
    id: string,
    data: Partial<{
      username: string;
      displayName: string;
      avatarUrl: string;
      bio: string;
      phone: string;
    }>,
  ) {
    return this.prisma.user.update({
      where: { id },
      data: {
        ...(data.username !== undefined && { username: data.username }),
        profile: {
          update: {
            ...(data.displayName !== undefined && { displayName: data.displayName }),
            ...(data.avatarUrl !== undefined && { avatarUrl: data.avatarUrl }),
            ...(data.bio !== undefined && { bio: data.bio }),
            ...(data.phone !== undefined && { phone: data.phone }),
          },
        },
      },
      include: {
        profile: true,
        authAccounts: true,
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
