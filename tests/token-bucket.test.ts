import { describe, it, expect, beforeEach, vi } from 'vitest';
import { tokenBucket } from '@/strategies';
import { MemoryStore } from '@/store';

describe('tokenBucket', () => {
  let store: MemoryStore;

  beforeEach(() => {
    store = new MemoryStore();
    vi.restoreAllMocks();
  });

  it('should allow requests when bucket has tokens', async () => {
    const result = await tokenBucket(store, 'key1', 10, 60);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(9);
    expect(result.limit).toBe(10);
  });

  it('should consume tokens with each request', async () => {
    const now = 1000;
    vi.spyOn(Date, 'now').mockReturnValue(now * 1000);

    await tokenBucket(store, 'key1', 5, 60);
    await tokenBucket(store, 'key1', 5, 60);
    const result = await tokenBucket(store, 'key1', 5, 60);

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(2);
  });

  it('should deny requests when bucket is empty', async () => {
    const now = 1000;
    vi.spyOn(Date, 'now').mockReturnValue(now * 1000);

    const max = 2;
    await tokenBucket(store, 'key1', max, 60);
    await tokenBucket(store, 'key1', max, 60);
    const result = await tokenBucket(store, 'key1', max, 60);

    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('should refill tokens over time', async () => {
    const now = 1000;
    const window = 10;
    const max = 10;
    const refillRate = max / window; // 1 token/sec

    vi.spyOn(Date, 'now').mockReturnValue(now * 1000);

    // consume all tokens
    for (let i = 0; i < max; i++) {
      await tokenBucket(store, 'key1', max, window);
    }

    // verify bucket is empty
    const empty = await tokenBucket(store, 'key1', max, window);
    expect(empty.allowed).toBe(false);

    // advance time by 5 seconds → should refill 5 tokens
    vi.spyOn(Date, 'now').mockReturnValue((now + 5) * 1000);

    const result = await tokenBucket(store, 'key1', max, window);
    expect(result.allowed).toBe(true);
    // 0 tokens + 5s * 1 token/s = 5 refilled, minus 1 for this request = 4
    expect(result.remaining).toBe(4);
  });

  it('should not refill beyond max capacity', async () => {
    const now = 1000;
    vi.spyOn(Date, 'now').mockReturnValue(now * 1000);

    await tokenBucket(store, 'key1', 5, 10);

    // advance time well beyond a full refill
    vi.spyOn(Date, 'now').mockReturnValue((now + 100) * 1000);

    const result = await tokenBucket(store, 'key1', 5, 10);
    expect(result.allowed).toBe(true);
    // should be capped at max (5) minus 1 = 4
    expect(result.remaining).toBe(4);
  });

  it('should track separate keys independently', async () => {
    const now = 1000;
    vi.spyOn(Date, 'now').mockReturnValue(now * 1000);

    await tokenBucket(store, 'key1', 1, 60);
    const result = await tokenBucket(store, 'key2', 1, 60);

    expect(result.allowed).toBe(true);
  });

  it('should return resetAt in the future when denied', async () => {
    const now = 1000;
    vi.spyOn(Date, 'now').mockReturnValue(now * 1000);

    await tokenBucket(store, 'key1', 1, 60);
    const result = await tokenBucket(store, 'key1', 1, 60);

    expect(result.allowed).toBe(false);
    expect(result.resetAt).toBeGreaterThan(now);
  });
});
