export interface Store {
  increment(
    key: string,
    window: number,
  ): Promise<{ count: number; resetAt: number }>;
  get(key: string): Promise<number | null>;
  set(key: string, value: number, ttl: number): Promise<void>;
  reset: (key: string) => Promise<void>;
}
