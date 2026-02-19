import { Logger } from '@nestjs/common';

export interface RawEvent {
  timestamp: Date;
  eventType: string;
  entity?: string;
  value?: number;
  metadata?: Record<string, any>;
  rawData?: Record<string, any>;
}

export abstract class BaseIngestionService {
  protected abstract readonly logger: Logger;
  protected abstract readonly sourceName: string;

  abstract fetch(): Promise<RawEvent[]>;

  protected async fetchWithRetry<T>(
    fn: () => Promise<T>,
    retries = 3,
    delay = 1000,
  ): Promise<T> {
    for (let i = 0; i < retries; i++) {
      try {
        return await fn();
      } catch (error) {
        this.logger.warn(
          `${this.sourceName} fetch attempt ${i + 1}/${retries} failed: ${error.message}`,
        );
        if (i < retries - 1) {
          await this.sleep(delay * Math.pow(2, i)); // Exponential backoff
        } else {
          throw error;
        }
      }
    }
    throw new Error('Should not reach here');
  }

  protected sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  protected parseDate(dateStr: string): Date | null {
    try {
      const date = new Date(dateStr);
      return isNaN(date.getTime()) ? null : date;
    } catch {
      return null;
    }
  }
}
