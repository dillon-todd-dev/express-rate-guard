import type { Store } from '@/store';
import type { RateLimitInfo } from '@/types';

export async function slidingWindow(
  store: Store,
  key: string,
  max: number,
  window: number,
): Promise<RateLimitInfo & { allowed: boolean }> {
  const now = Math.floor(Date.now() / 1000);
  const currentWindow = Math.floor(now / window);
  const elapsed = now - currentWindow * window;
  const weight = 1 - elapsed / window;

  const currentKey = `${key}:${currentWindow}`;
  const previousKey = `${key}:${currentWindow - 1}`;

  const { count: currentCount } = await store.increment(
    currentKey,
    window * 2,
  );
  const resetAt = (currentWindow + 1) * window;
  const previousCount = (await store.get(previousKey)) ?? 0;

  const estimatedCount = Math.floor(previousCount * weight) + currentCount;

  return {
    allowed: estimatedCount <= max,
    limit: max,
    remaining: Math.max(0, max - estimatedCount),
    resetAt,
  };
}
