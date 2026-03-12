import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RedisStore } from '@/store';

function createMockRedis() {
  const data = new Map<string, string>();
  const expiry = new Map<string, number>();

  return {
    get: vi.fn(async (key: string) => data.get(key) ?? null),
    del: vi.fn(async (key: string) => {
      data.delete(key);
      expiry.delete(key);
      return 1;
    }),
    eval: vi.fn(
      async (
        _script: string,
        _numKeys: number,
        key: string,
        resetAt: number,
      ) => {
        const current = data.get(key);
        const count = current ? parseInt(current, 10) + 1 : 1;
        data.set(key, String(count));
        if (count === 1) {
          expiry.set(key, resetAt);
        }
        return count;
      },
    ),
    _data: data,
    _expiry: expiry,
  };
}

describe('RedisStore', () => {
  let store: RedisStore;
  let mockRedis: ReturnType<typeof createMockRedis>;

  beforeEach(() => {
    mockRedis = createMockRedis();
    store = new RedisStore(mockRedis as any);
  });

  describe('increment', () => {
    it('should return count of 1 on first increment', async () => {
      const result = await store.increment('key1', 60);
      expect(result.count).toBe(1);
    });

    it('should increment count on subsequent calls', async () => {
      await store.increment('key1', 60);
      await store.increment('key1', 60);
      const result = await store.increment('key1', 60);
      expect(result.count).toBe(3);
    });

    it('should return a resetAt timestamp', async () => {
      const now = Math.floor(Date.now() / 1000);
      const result = await store.increment('key1', 60);
      expect(result.resetAt).toBeGreaterThanOrEqual(now + 60);
    });

    it('should call redis eval with the correct arguments', async () => {
      await store.increment('test-key', 60);
      expect(mockRedis.eval).toHaveBeenCalledWith(
        expect.any(String),
        1,
        'test-key',
        expect.any(Number),
      );
    });

    it('should set expiry only on first increment', async () => {
      await store.increment('key1', 60);
      await store.increment('key1', 60);

      // expiry is set only when count == 1 (in the Lua script)
      // our mock tracks this - expiry should exist from first call
      expect(mockRedis._expiry.has('key1')).toBe(true);
    });
  });

  describe('get', () => {
    it('should return null for a non-existent key', async () => {
      const value = await store.get('nonexistent');
      expect(value).toBeNull();
    });

    it('should return the parsed integer count', async () => {
      mockRedis._data.set('key1', '5');
      const value = await store.get('key1');
      expect(value).toBe(5);
    });

    it('should call redis get with the correct key', async () => {
      await store.get('test-key');
      expect(mockRedis.get).toHaveBeenCalledWith('test-key');
    });
  });

  describe('reset', () => {
    it('should call redis del with the correct key', async () => {
      await store.reset('test-key');
      expect(mockRedis.del).toHaveBeenCalledWith('test-key');
    });

    it('should remove the key from the store', async () => {
      mockRedis._data.set('key1', '3');
      await store.reset('key1');
      const value = await store.get('key1');
      expect(value).toBeNull();
    });
  });
});
