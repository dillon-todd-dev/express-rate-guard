import type { Store } from '@/store';
import type { RateLimitInfo } from '@/types';

export async function fixedWindow(
  store: Store,
  key: string,
  max: number,
  window: number,
): Promise<RateLimitInfo & { allowed: boolean }> {
  const { count, resetAt } = await store.increment(key, window);

  return {
    allowed: count <= max,
    limit: max,
    remaining: Math.max(0, max - count),
    resetAt,
  };
}
