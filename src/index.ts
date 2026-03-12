import type { Request, Response, NextFunction } from 'express';
import type { RateLimitOptions } from '@/types';
import { MemoryStore } from '@/store';
import { fixedWindow } from '@/strategies/fixed-window';

export { RateLimitOptions } from '@/types';

export function rateLimit(options: RateLimitOptions) {
  const {
    max,
    window,
    strategy = 'fixed-window',
    redis,
    keyGenerator = (req: Request) => req.ip ?? 'unknown',
    message = 'Too many requests, please try again later.',
    statusCode = 429,
    onLimitReached,
  } = options;

  // TODO: swap redis client if present
  const store = new MemoryStore();

  return async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    const key = `erg:${strategy}:${keyGenerator(req)}`;

    try {
      let result;

      if (strategy === 'fixed-window') {
        result = await fixedWindow(store, key, max, window);
      } else {
        return next(new Error(`Unknown strategy: ${strategy}`));
      }

      res.setHeader('X-RateLimit-Limit', result.limit);
      res.setHeader('X-RateLimit-Remaining', result.remaining);
      res.setHeader('X-RateLimit-Reset', result.resetAt);

      if (!result.allowed) {
        onLimitReached?.(req, res);
        res.setHeader(
          'Retry-After',
          Math.ceil((result.resetAt * 1000 - Date.now()) / 1000),
        );
        res.status(statusCode).json({ error: message });
        return;
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}
