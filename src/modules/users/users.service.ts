import { Inject, Injectable, Logger } from '@nestjs/common';
import { AuthProvider } from '@prisma/client';
import { ConflictError, NotFoundError } from '../../shared/common/domain-errors';
import { CacheService } from '../../shared/infrastructure/cache/cache.service';
import { STORAGE_PORT, StoragePort } from '../../shared/infrastructure/ports/storage.port';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateUserData, UsersRepository } from './users.repository';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly cacheService: CacheService,
    @Inject(STORAGE_PORT) private readonly storage: StoragePort,
  ) {}

  async findById(id: string) {
    return this.cacheService.getOrSet(
      CacheService.keys.user(id),
      () => this.usersRepository.findById(id),
      300,
    );
  }

  async findByEmail(email: string) {
    return this.usersRepository.findByEmail(email);
  }

  async findByUsername(username: string) {
    return this.usersRepository.findByUsername(username);
  }

  async findByProvider(provider: AuthProvider, providerId: string) {
    return this.usersRepository.findByProvider(provider, providerId);
  }

  async linkAuthAccount(userId: string, provider: AuthProvider, providerId: string) {
    const linked = await this.usersRepository.linkAuthAccount(userId, provider, providerId);
    await this.cacheService.del(CacheService.keys.user(userId));
    return linked;
  }

  async generateUniqueUsername(nameOrEmail: string): Promise<string> {
    let baseUsername = (nameOrEmail.split('@')[0] || '').toLowerCase().replace(/[^a-z0-9_]/g, '');

    if (baseUsername.length > 25) {
      baseUsername = baseUsername.substring(0, 25);
    }

    if (!baseUsername) {
      baseUsername = 'user';
    }

    let username = baseUsername;
    let counter = 1;
    let isUnique = false;

    while (!isUnique) {
      const existing = await this.usersRepository.findByUsername(username);
      if (!existing) {
        isUnique = true;
      } else {
        username = `${baseUsername}${counter}`;
        counter++;
      }
    }
    return username;
  }

  async create(data: CreateUserData) {
    if (!data.username) {
      data.username = await this.generateUniqueUsername(data.displayName || data.email);
    }
    return this.usersRepository.create(data);
  }

  async update(id: string, dto: UpdateUserDto) {
    const user = await this.usersRepository.findById(id);
    if (!user) throw new NotFoundError('User', id);

    if (dto.username && dto.username !== user.username) {
      const existing = await this.usersRepository.findByUsername(dto.username);
      if (existing) {
        throw new ConflictError('Username is already taken');
      }
    }

    const updated = await this.usersRepository.update(id, dto);
    await this.cacheService.del(CacheService.keys.user(id));
    return updated;
  }

  async uploadAvatar(userId: string, file: Express.Multer.File) {
    const user = await this.usersRepository.findById(userId);
    if (!user) throw new NotFoundError('User', userId);

    const key = `users/${userId}/avatar-${Date.now()}`;
    const uploadResponse = await this.storage.upload({
      key,
      buffer: file.buffer,
      mimeType: file.mimetype,
    });

    try {
      const updated = await this.usersRepository.update(userId, {
        avatarUrl: uploadResponse.url,
      });
      await this.cacheService.del(CacheService.keys.user(userId));
      return updated;
    } catch (error) {
      this.storage
        .delete(uploadResponse.key)
        .catch((e) => this.logger.error('Failed to rollback avatar', e));
      throw error;
    }
  }

  async getProfile(id: string) {
    const user = await this.findById(id);
    if (!user) throw new NotFoundError('User', id);
    return user;
  }
}
