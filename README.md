# express-rate-guard

Flexible Express rate limiting middleware with Redis and in-memory support. Supports fixed window, sliding window, and token bucket strategies.

## Installation

```bash
npm install express-rate-guard
```

## Quick Start

```typescript
import express from 'express';
import { rateLimit } from 'express-rate-guard';

const app = express();

app.use(rateLimit({
  max: 100,    // 100 requests
  window: 60,  // per 60 seconds
}));

app.get('/', (req, res) => {
  res.send('Hello!');
});

app.listen(3000);
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `max` | `number` | *required* | Maximum number of requests allowed in the window |
| `window` | `number` | *required* | Time window in seconds |
| `strategy` | `string` | `'fixed-window'` | Rate limiting strategy (`'fixed-window'`, `'sliding-window'`, `'token-bucket'`) |
| `redis` | `Redis` | `undefined` | [ioredis](https://github.com/redis/ioredis) client instance. Falls back to in-memory store if not provided |
| `keyGenerator` | `(req) => string` | `req.ip` | Custom function to derive a key from the request |
| `message` | `string` | `'Too many requests, please try again later.'` | Response message when rate limited |
| `statusCode` | `number` | `429` | HTTP status code when rate limited |
| `onLimitReached` | `(req, res) => void` | `undefined` | Callback fired when a request is rate limited |

## Using Redis

For production or multi-instance deployments, use Redis as the backing store:

```typescript
import Redis from 'ioredis';
import { rateLimit } from 'express-rate-guard';

const redis = new Redis();

app.use(rateLimit({
  max: 100,
  window: 60,
  redis,
}));
```

## Custom Key Generator

Rate limit by a custom key instead of IP address:

```typescript
app.use(rateLimit({
  max: 100,
  window: 60,
  keyGenerator: (req) => req.headers['x-api-key'] as string,
}));
```

## Handling Rate Limit Events

```typescript
app.use(rateLimit({
  max: 100,
  window: 60,
  onLimitReached: (req, res) => {
    console.log(`Rate limit exceeded for ${req.ip}`);
  },
}));
```

## Response Headers

Every response includes the following headers:

| Header | Description |
|--------|-------------|
| `X-RateLimit-Limit` | Maximum requests allowed in the window |
| `X-RateLimit-Remaining` | Remaining requests in the current window |
| `X-RateLimit-Reset` | Unix timestamp when the window resets |
| `Retry-After` | Seconds until the client can retry (only on `429` responses) |

## License

MIT
