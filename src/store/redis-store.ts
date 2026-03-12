import { Store } from '@/store';
import type { Redis } from 'ioredis';

export class RedisStore implements Store {
  constructor(private redis: Redis) {}

  async increment(
    key: string,
    window: number,
  ): Promise<{ count: number; resetAt: number }> {
    const now = Math.floor(Date.now() / 1000);
    const resetAt = now + window;

    const count = (await this.redis.eval(
      `
        local count = redis.call('INCR', KEYS[1])
        if count == 1 then
            redis.call('EXPIREAT', KEYS[1], ARGV[1])
        end
        return count
     `,
      1, // number of keys
      key, // KEYS[1]
      resetAt, // ARGV[1]
    )) as number;

    return { count, resetAt };
  }

  async get(key: string): Promise<number | null> {
    const val = await this.redis.get(key);
    return val !== null ? parseInt(val, 10) : null;
  }

  async set(key: string, value: number, ttl: number): Promise<void> {
    await this.redis.set(key, value, 'EX', ttl);
  }

  async reset(key: string): Promise<void> {
    await this.redis.del(key);
  }
}
