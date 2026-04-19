const FOREGROUND_MIN_INTERVAL_MS = 60_000;
const EVICTION_HIGH_WATER_MARK = 10_000;

export class ActivityRateLimiter {
  private readonly lastRecordedAt = new Map<string, number>();

  public shouldRecord(userId: string, now: number = Date.now()): boolean {
    const previous = this.lastRecordedAt.get(userId);
    if (previous !== undefined && now - previous < FOREGROUND_MIN_INTERVAL_MS) {
      return false;
    }
    this.lastRecordedAt.set(userId, now);
    this.evictExpired(now);
    return true;
  }

  private evictExpired(now: number): void {
    if (this.lastRecordedAt.size < EVICTION_HIGH_WATER_MARK) {
      return;
    }
    for (const [userId, lastAt] of this.lastRecordedAt) {
      if (now - lastAt >= FOREGROUND_MIN_INTERVAL_MS) {
        this.lastRecordedAt.delete(userId);
      }
    }
  }
}
