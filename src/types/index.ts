import type { Request, Response } from 'express';
import type { Redis } from 'ioredis';

export type Strategy = 'fixed-window' | 'sliding-window' | 'token-bucket';

export interface RateLimitOptions {
  /** Max number of requests allowed in the window (or max tokens for token-bucket) */
  max: number;
  /** Time window in milliseconds  */
  windowMs: number;
  /** Rate limiting strategy. Defaults to 'fixed-window' */
  strategy?: Strategy;
  /** Optional Redis client. Falls back to in-memory store if not provided */
  redis?: Redis;
  /** Custom function to derive a key from the request (defaults to IP address) */
  keyGenerator?: (req: Request) => string;
  /** Custom message to return when rate limit is exceeded */
  message?: string;
  /** HTTP status code to return when rate limit is exceeded. Defaults to 429 */
  statusCode?: number;
  /** Optional callback fired when a request is rate limited */
  onLimitReached?: (req: Request, res: Response) => void;
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetAt: number; // unix timestamp in milliseconds
}
