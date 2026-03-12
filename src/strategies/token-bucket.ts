import type { Store } from '@/store';
import type { RateLimitInfo } from '@/types';

export async function tokenBucket(
  store: Store,
  key: string,
  max: number,
  window: number,
): Promise<RateLimitInfo & { allowed: boolean }> {
  const now = Math.floor(Date.now() / 1000);
  const refillRate = max / window; // tokens per second

  const tokensKey = `${key}:tokens`;
  const lastRefillKey = `${key}:last_refill`;

  const storedTokens = await store.get(tokensKey);
  const lastRefill = await store.get(lastRefillKey);

  let tokens: number;

  if (storedTokens === null || lastRefill === null) {
    // first request — start with a full bucket minus this request
    tokens = max - 1;
  } else {
    const elapsed = now - lastRefill;
    const refilled = Math.min(max, storedTokens + elapsed * refillRate);
    tokens = refilled - 1;
  }

  const allowed = tokens >= 0;
  const remaining = Math.max(0, Math.floor(tokens));
  const ttl = window * 2;

  await store.set(tokensKey, allowed ? tokens : 0, ttl);
  await store.set(lastRefillKey, now, ttl);

  return {
    allowed,
    limit: max,
    remaining,
    resetAt: now + (allowed ? 0 : Math.ceil((1 - tokens) / refillRate)),
  };
}
