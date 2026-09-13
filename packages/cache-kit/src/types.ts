export type CacheErrorHandler = (
  error: unknown,
  context: { operation: string; key?: string },
) => void;

export interface CacheSetOptions {
  /** Tags this key should be registered under for later bulk invalidation. */
  tags?: string[];
}

export type CacheResultStatus = "hit" | "miss" | "bypass";

export interface CacheResult<T> {
  value: T;
  /**
   * "hit" — served from Redis.
   * "miss" — Redis was reachable but had no value; fetched from the source.
   * "bypass" — Redis was unreachable; fetched from the source without ever
   * consulting the cache (fail-open, not a normal miss).
   */
  status: CacheResultStatus;
}

export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
}

export interface CacheOptions {
  onError?: CacheErrorHandler;
  /** Key prefix under which hit/miss counters are stored, e.g. "cacheforge:stats". */
  statsKeyPrefix?: string;
}

export interface Cache {
  get<T>(key: string): Promise<T | null>;
  set<T>(
    key: string,
    value: T,
    ttlSeconds: number,
    options?: CacheSetOptions,
  ): Promise<void>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  getOrSet<T>(
    key: string,
    ttlSeconds: number,
    fetcher: () => Promise<T>,
    options?: CacheSetOptions,
  ): Promise<CacheResult<T>>;
  /** Deletes every key registered under `tag`, then the tag set itself. */
  invalidateTag(tag: string): Promise<void>;
  getStats(): Promise<CacheStats>;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: Date;
}

export interface RateLimiterOptions {
  windowSeconds: number;
  max: number;
  /** Key prefix, e.g. "cacheforge:ratelimit:read". */
  keyPrefix: string;
  onError?: CacheErrorHandler;
}

export interface RateLimiter {
  consume(identifier: string): Promise<RateLimitResult>;
}

export interface PubSubMessage<T = unknown> {
  type: string;
  payload: T;
  at: string;
}

export interface PubSubOptions {
  onError?: CacheErrorHandler;
}

export interface PubSub {
  publish<T>(channel: string, message: PubSubMessage<T>): Promise<void>;
  /** Returns an unsubscribe function that closes the dedicated subscriber connection. */
  subscribe<T>(
    channel: string,
    handler: (message: PubSubMessage<T>) => void,
  ): Promise<() => Promise<void>>;
}
