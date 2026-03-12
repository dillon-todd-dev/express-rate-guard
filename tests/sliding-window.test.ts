import { describe, it, expect, beforeEach, vi } from 'vitest';
import { slidingWindow } from '@/strategies';
import { MemoryStore } from '@/store';

describe('slidingWindow', () => {
  let store: MemoryStore;

  beforeEach(() => {
    store = new MemoryStore();
    vi.restoreAllMocks();
  });

  it('should allow requests under the limit', async () => {
    const result = await slidingWindow(store, 'key1', 5, 60);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
    expect(result.limit).toBe(5);
  });

  it('should deny requests over the limit', async () => {
    const max = 2;
    await slidingWindow(store, 'key1', max, 60);
    await slidingWindow(store, 'key1', max, 60);
    const result = await slidingWindow(store, 'key1', max, 60);

    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('should weight previous window count into the estimate', async () => {
    const now = 1000;
    const window = 10;

    // set time to the start of a window
    vi.spyOn(Date, 'now').mockReturnValue(now * 1000);

    // fill up previous window
    const max = 4;
    await slidingWindow(store, 'key1', max, window);
    await slidingWindow(store, 'key1', max, window);
    await slidingWindow(store, 'key1', max, window);
    await slidingWindow(store, 'key1', max, window);

    // move to 50% through the next window
    // previous window weight = 0.5, so estimated = floor(4 * 0.5) + 1 = 3
    vi.spyOn(Date, 'now').mockReturnValue((now + window + window / 2) * 1000);

    const result = await slidingWindow(store, 'key1', max, window);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(1);
  });

  it('should deny when weighted previous count plus current exceeds max', async () => {
    const now = 1000;
    const window = 10;
    const max = 3;

    vi.spyOn(Date, 'now').mockReturnValue(now * 1000);

    // fill up previous window
    await slidingWindow(store, 'key1', max, window);
    await slidingWindow(store, 'key1', max, window);
    await slidingWindow(store, 'key1', max, window);

    // move to 10% through the next window
    // previous weight = 0.9, estimated = floor(3 * 0.9) + currentCount
    vi.spyOn(Date, 'now').mockReturnValue((now + window + 1) * 1000);

    // first request: floor(3 * 0.9) + 1 = 3 → allowed (3 <= 3)
    const r1 = await slidingWindow(store, 'key1', max, window);
    expect(r1.allowed).toBe(true);

    // second request: floor(3 * 0.9) + 2 = 4 → denied (4 > 3)
    const r2 = await slidingWindow(store, 'key1', max, window);
    expect(r2.allowed).toBe(false);
  });

  it('should track separate keys independently', async () => {
    await slidingWindow(store, 'key1', 1, 60);
    const result = await slidingWindow(store, 'key2', 1, 60);

    expect(result.allowed).toBe(true);
  });

  it('should return a resetAt at the end of the current window', async () => {
    const now = Math.floor(Date.now() / 1000);
    const window = 60;
    const currentWindow = Math.floor(now / window);
    const expectedResetAt = (currentWindow + 1) * window;

    const result = await slidingWindow(store, 'key1', 5, window);
    expect(result.resetAt).toBe(expectedResetAt);
  });
});
