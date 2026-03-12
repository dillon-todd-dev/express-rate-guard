import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { rateLimit } from '@/index';

function createMockReq(ip = '127.0.0.1'): Request {
  return { ip } as Request;
}

function createMockRes(): Response {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    setHeader: vi.fn().mockReturnThis(),
  };
  return res as unknown as Response;
}

describe('rateLimit', () => {
  let next: NextFunction;

  beforeEach(() => {
    next = vi.fn();
  });

  it('should allow requests under the limit', async () => {
    const middleware = rateLimit({ max: 5, window: 60 });
    const req = createMockReq();
    const res = createMockRes();

    await middleware(req, res, next);

    expect(next).toHaveBeenCalledWith();
    expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', 5);
    expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', 4);
  });

  it('should block requests over the limit', async () => {
    const middleware = rateLimit({ max: 2, window: 60 });
    const req = createMockReq();
    const res = createMockRes();

    await middleware(req, res, next);
    await middleware(req, res, next);
    await middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Too many requests, please try again later.',
    });
  });

  it('should use custom status code', async () => {
    const middleware = rateLimit({ max: 1, window: 60, statusCode: 503 });
    const req = createMockReq();
    const res = createMockRes();

    await middleware(req, res, next);
    await middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(503);
  });

  it('should use custom message', async () => {
    const middleware = rateLimit({
      max: 1,
      window: 60,
      message: 'Slow down!',
    });
    const req = createMockReq();
    const res = createMockRes();

    await middleware(req, res, next);
    await middleware(req, res, next);

    expect(res.json).toHaveBeenCalledWith({ error: 'Slow down!' });
  });

  it('should use custom key generator', async () => {
    const keyGenerator = vi.fn(() => 'custom-key');
    const middleware = rateLimit({ max: 5, window: 60, keyGenerator });
    const req = createMockReq();
    const res = createMockRes();

    await middleware(req, res, next);

    expect(keyGenerator).toHaveBeenCalledWith(req);
  });

  it('should call onLimitReached when rate limited', async () => {
    const onLimitReached = vi.fn();
    const middleware = rateLimit({ max: 1, window: 60, onLimitReached });
    const req = createMockReq();
    const res = createMockRes();

    await middleware(req, res, next);
    await middleware(req, res, next);

    expect(onLimitReached).toHaveBeenCalledWith(req, res);
  });

  it('should not call onLimitReached when under limit', async () => {
    const onLimitReached = vi.fn();
    const middleware = rateLimit({ max: 5, window: 60, onLimitReached });
    const req = createMockReq();
    const res = createMockRes();

    await middleware(req, res, next);

    expect(onLimitReached).not.toHaveBeenCalled();
  });

  it('should set Retry-After header when rate limited', async () => {
    const middleware = rateLimit({ max: 1, window: 60 });
    const req = createMockReq();
    const res = createMockRes();

    await middleware(req, res, next);
    await middleware(req, res, next);

    expect(res.setHeader).toHaveBeenCalledWith(
      'Retry-After',
      expect.any(Number),
    );
  });

  it('should track different IPs separately', async () => {
    const middleware = rateLimit({ max: 1, window: 60 });
    const req1 = createMockReq('1.1.1.1');
    const req2 = createMockReq('2.2.2.2');
    const res1 = createMockRes();
    const res2 = createMockRes();

    await middleware(req1, res1, next);
    await middleware(req2, res2, next);

    // both should be allowed (different IPs, each gets their own counter)
    expect(next).toHaveBeenCalledTimes(2);
  });

  it('should set X-RateLimit-Reset header', async () => {
    const middleware = rateLimit({ max: 5, window: 60 });
    const req = createMockReq();
    const res = createMockRes();

    await middleware(req, res, next);

    expect(res.setHeader).toHaveBeenCalledWith(
      'X-RateLimit-Reset',
      expect.any(Number),
    );
  });

  it('should call next with error for unknown strategy', async () => {
    const middleware = rateLimit({
      max: 5,
      window: 60,
      strategy: 'token-bucket' as any,
    });
    const req = createMockReq();
    const res = createMockRes();

    await middleware(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  it('should default to fixed-window strategy', async () => {
    const middleware = rateLimit({ max: 5, window: 60 });
    const req = createMockReq();
    const res = createMockRes();

    await middleware(req, res, next);

    expect(next).toHaveBeenCalledWith();
    expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', 4);
  });
});
