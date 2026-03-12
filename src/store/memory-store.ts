import { Store } from '@/store';

interface MemoryEntry {
  count: number;
  resetAt: number;
}

export class MemoryStore implements Store {
  private data: Map<string, MemoryEntry>;

  constructor() {
    this.data = new Map<string, MemoryEntry>();
  }

  async increment(
    key: string,
    window: number,
  ): Promise<{ count: number; resetAt: number }> {
    const now = Math.floor(Date.now() / 1000);
    const entry = this.data.get(key);

    if (!entry || now >= entry.resetAt) {
      const resetAt = now + window;
      this.data.set(key, { count: 1, resetAt });
      return { count: 1, resetAt };
    }

    entry.count++;
    return { count: entry.count, resetAt: entry.resetAt };
  }

  async get(key: string): Promise<number | null> {
    const entry = this.data.get(key);
    if (!entry) {
      return null;
    }

    const now = Math.floor(Date.now() / 1000);
    return now < entry.resetAt ? entry.count : null;
  }

  async set(key: string, value: number, ttl: number): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    this.data.set(key, { count: value, resetAt: now + ttl });
  }

  async reset(key: string): Promise<void> {
    this.data.delete(key);
  }
}
