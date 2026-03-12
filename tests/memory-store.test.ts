import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MemoryStore } from '@/store';

describe('MemoryStore', () => {
  let store: MemoryStore;

  beforeEach(() => {
    store = new MemoryStore();
    vi.restoreAllMocks();
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

    it('should return a resetAt timestamp in the future', async () => {
      const now = Math.floor(Date.now() / 1000);
      const result = await store.increment('key1', 60);
      expect(result.resetAt).toBeGreaterThanOrEqual(now + 60);
    });

    it('should track separate keys independently', async () => {
      await store.increment('key1', 60);
      await store.increment('key1', 60);
      await store.increment('key2', 60);

      const val1 = await store.get('key1');
      const val2 = await store.get('key2');
      expect(val1).toBe(2);
      expect(val2).toBe(1);
    });

    it('should reset count after the window expires', async () => {
      const now = Math.floor(Date.now() / 1000);
      vi.spyOn(Date, 'now').mockReturnValue(now * 1000);

      await store.increment('key1', 10);
      await store.increment('key1', 10);

      // advance time past the window
      vi.spyOn(Date, 'now').mockReturnValue((now + 11) * 1000);

      const result = await store.increment('key1', 10);
      expect(result.count).toBe(1);
    });
  });

  describe('get', () => {
    it('should return null for a non-existent key', async () => {
      const value = await store.get('nonexistent');
      expect(value).toBeNull();
    });

    it('should return the count for an existing key', async () => {
      await store.increment('key1', 60);
      const value = await store.get('key1');
      expect(value).toBe(1);
    });

    it('should return null after the window expires', async () => {
      const now = Math.floor(Date.now() / 1000);
      vi.spyOn(Date, 'now').mockReturnValue(now * 1000);

      await store.increment('key1', 10);

      vi.spyOn(Date, 'now').mockReturnValue((now + 11) * 1000);

      const value = await store.get('key1');
      expect(value).toBeNull();
    });
  });

  describe('reset', () => {
    it('should remove the key', async () => {
      await store.increment('key1', 60);
      await store.reset('key1');
      const value = await store.get('key1');
      expect(value).toBeNull();
    });

    it('should not affect other keys', async () => {
      await store.increment('key1', 60);
      await store.increment('key2', 60);
      await store.reset('key1');

      const val1 = await store.get('key1');
      const val2 = await store.get('key2');
      expect(val1).toBeNull();
      expect(val2).toBe(1);
    });
  });
});
