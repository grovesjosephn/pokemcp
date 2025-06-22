export interface RateLimiterStats {
  requestCount: number;
  averageInterval: number;
}

export class RateLimiter {
  private lastRequestTime = 0;
  private requestCount = 0;
  private readonly minInterval: number;
  private readonly maxRequestsPerMinute: number;

  constructor(requestsPerMinute = 100) {
    this.maxRequestsPerMinute = requestsPerMinute;
    this.minInterval = 60000 / requestsPerMinute; // ms between requests
  }

  async waitForSlot(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.minInterval) {
      const waitTime = this.minInterval - timeSinceLastRequest;
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }

    this.lastRequestTime = Date.now();
    this.requestCount++;
  }

  getStats(): RateLimiterStats {
    return {
      requestCount: this.requestCount,
      averageInterval:
        this.requestCount > 1
          ? (Date.now() - this.lastRequestTime) / this.requestCount
          : 0,
    };
  }

  reset(): void {
    this.lastRequestTime = 0;
    this.requestCount = 0;
  }
}
