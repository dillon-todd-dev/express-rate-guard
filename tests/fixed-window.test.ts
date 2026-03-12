import { describe, it, expect, beforeEach } from 'vitest';
import { fixedWindow } from '@/strategies/fixed-window';
import { MemoryStore } from '@/store';

describe('fixedWindow', () => {
  let store: MemoryStore;

  beforeEach(() => {
    store = new MemoryStore();
  });

  it('should allow requests under the limit', async () => {
    const result = await fixedWindow(store, 'key1', 5, 60);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
    expect(result.limit).toBe(5);
  });

  it('should decrement remaining with each request', async () => {
    await fixedWindow(store, 'key1', 3, 60);
    await fixedWindow(store, 'key1', 3, 60);
    const result = await fixedWindow(store, 'key1', 3, 60);

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(0);
  });

  it('should deny requests over the limit', async () => {
    const max = 2;
    await fixedWindow(store, 'key1', max, 60);
    await fixedWindow(store, 'key1', max, 60);
    const result = await fixedWindow(store, 'key1', max, 60);

    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('should return remaining as 0 when over the limit', async () => {
    await fixedWindow(store, 'key1', 1, 60);
    const result = await fixedWindow(store, 'key1', 1, 60);

    expect(result.remaining).toBe(0);
  });

  it('should return a resetAt timestamp', async () => {
    const now = Math.floor(Date.now() / 1000);
    const result = await fixedWindow(store, 'key1', 5, 60);
    expect(result.resetAt).toBeGreaterThanOrEqual(now + 60);
  });

  it('should track separate keys independently', async () => {
    await fixedWindow(store, 'key1', 1, 60);
    const result = await fixedWindow(store, 'key2', 1, 60);

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(0);
  });

  it('should set limit to the max value', async () => {
    const result = await fixedWindow(store, 'key1', 100, 60);
    expect(result.limit).toBe(100);
  });
});
