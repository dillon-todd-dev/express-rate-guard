export interface Store {
  increment(
    key: string,
    window: number,
  ): Promise<{ count: number; resetAt: number }>;
  get(key: string): Promise<number | null>;
  reset: (key: string) => Promise<void>;
}
