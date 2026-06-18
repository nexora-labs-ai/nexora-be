import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { Cache } from 'cache-manager';

@Injectable()
export class CacheService {
  constructor(@Inject(CACHE_MANAGER) private readonly cache: Cache) {}

  async get<T>(key: string): Promise<T | undefined> {
    return this.cache.get<T>(key);
  }

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    await this.cache.set(key, value, ttlSeconds ? ttlSeconds * 1000 : undefined);
  }

  async del(key: string): Promise<void> {
    await this.cache.del(key);
  }

  async getOrSet<T>(key: string, factory: () => Promise<T>, ttlSeconds?: number): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== undefined) return cached;

    const value = await factory();
    await this.set(key, value, ttlSeconds);
    return value;
  }

  async invalidateByPattern(pattern: string): Promise<void> {
    // Implementation depends on Redis SCAN — handled at infrastructure level
    const store = (this.cache as unknown as { store: { keys?: (p: string) => Promise<string[]> } })
      .store;
    if (store?.keys) {
      const keys = await store.keys(pattern);
      await Promise.all(keys.map((k) => this.del(k)));
    }
  }

  // Feature-based key builders
  static keys = {
    user: (id: string) => `user:${id}`,
    group: (id: string) => `group:${id}`,
    groupMembers: (groupId: string) => `group:${groupId}:members`,
    expense: (id: string) => `expense:${id}`,
    groupExpenses: (groupId: string) => `group:${groupId}:expenses`,
    settlement: (groupId: string) => `group:${groupId}:settlement`,
    notifications: (userId: string) => `notifications:${userId}`,
    recommendation: (groupId: string) => `recommendation:${groupId}`,
  };
}
