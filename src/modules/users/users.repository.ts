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
    });
  }

  async findByEmail(email: string) {
    return this.prisma.user.findFirst({
      where: { email, deletedAt: null },
    });
  }

  async findByUsername(username: string) {
    return this.prisma.user.findFirst({
      where: { username, deletedAt: null },
    });
  }

  async create(data: CreateUserData) {
    return this.prisma.user.create({ data });
  }

  async update(id: string, data: Partial<{ displayName: string; avatarUrl: string }>) {
    return this.prisma.user.update({
      where: { id },
      data,
    });
  }

  async softDelete(id: string) {
    return this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
  }
}
