import { Injectable } from '@nestjs/common';
import { NotFoundError } from '../../shared/common/domain-errors';
import { CacheService } from '../../shared/infrastructure/cache/cache.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateUserData, UsersRepository } from './users.repository';

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly cacheService: CacheService,
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

  async create(data: CreateUserData) {
    return this.usersRepository.create(data);
  }

  async update(id: string, dto: UpdateUserDto) {
    const user = await this.usersRepository.findById(id);
    if (!user) throw new NotFoundError('User', id);

    const updated = await this.usersRepository.update(id, dto);
    await this.cacheService.del(CacheService.keys.user(id));
    return updated;
  }

  async getProfile(id: string) {
    const user = await this.findById(id);
    if (!user) throw new NotFoundError('User', id);
    return user;
  }
}
