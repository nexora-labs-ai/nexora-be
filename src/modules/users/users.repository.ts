import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';
import { AuthProvider } from '@prisma/client';

export interface CreateUserData {
  email: string;
  username: string;
  displayName: string;
  passwordHash?: string;
  avatarUrl?: string;
  provider: AuthProvider;
  providerId?: string;
  isEmailVerified?: boolean;
}

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id, deletedAt: null },
      include: { profile: true, accounts: true, settings: true },
    });
  }

  async findByEmail(email: string) {
    return this.prisma.user.findFirst({
      where: { email, deletedAt: null },
      include: { profile: true, accounts: true, settings: true },
    });
  }

  async findByUsername(username: string) {
    return this.prisma.user.findFirst({
      where: { username, deletedAt: null },
      include: { profile: true, accounts: true, settings: true },
    });
  }

  async create(data: CreateUserData) {
    return this.prisma.user.create({
      data: {
        email: data.email,
        username: data.username,
        isEmailVerified: data.isEmailVerified,
        profile: {
          create: {
            displayName: data.displayName,
            avatarUrl: data.avatarUrl,
          },
        },
        settings: {
          create: {},
        },
        accounts: {
          create: {
            provider: data.provider,
            providerAccountId: data.providerId,
            passwordHash: data.passwordHash,
          },
        },
      },
      include: { profile: true, accounts: true, settings: true },
    });
  }

  async update(id: string, data: Partial<{ displayName: string; avatarUrl: string }>) {
    return this.prisma.user.update({
      where: { id },
      data: {
        profile: {
          update: data,
        },
      },
      include: { profile: true, accounts: true, settings: true },
    });
  }

  async softDelete(id: string) {
    return this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
  }
}
