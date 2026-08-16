import { sha256 } from "./crypto.ts";
import { incrementWindow } from "./redis.ts";

export class RateLimitError extends Error {
  readonly retryAfter: number;

  constructor(retryAfter: number) {
    super("Too many authorization requests");
    this.retryAfter = retryAfter;
  }
}

export async function enforceRateLimit(
  bucket: string,
  identity: string,
  limit: number,
  windowSeconds: number,
): Promise<void> {
  const key = `solvebase:oauth:rate:${bucket}:${sha256(identity)}`;
  const count = await incrementWindow(key, windowSeconds);
  if (count > limit) throw new RateLimitError(windowSeconds);
}
