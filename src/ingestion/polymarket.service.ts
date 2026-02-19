import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseIngestionService, RawEvent } from './base.service';

interface PolymarketMarket {
  id: string;
  condition_id: string;
  question: string;
  outcomes: string[];
  outcomePrices: string[];
  volume: string;
  liquidity: string;
  endDate: string;
  active: boolean;
  closed: boolean;
  category?: string;
  tags?: string[];
}

@Injectable()
export class PolymarketService extends BaseIngestionService {
  protected readonly logger = new Logger(PolymarketService.name);
  protected readonly sourceName = 'Polymarket';

  private readonly baseUrl = 'https://gamma-api.polymarket.com';

  // Track price changes between fetches
  private previousPrices: Map<string, number> = new Map();

  constructor(private configService: ConfigService) {
    super();
  }

  async fetch(): Promise<RawEvent[]> {
    const events: RawEvent[] = [];

    try {
      const markets = await this.fetchActiveMarkets();

      for (const market of markets) {
        // Track significant price movements
        const priceEvents = this.detectPriceMovement(market);
        events.push(...priceEvents);

        // Track volume spikes
        const volumeEvents = this.detectVolumeSpike(market);
        events.push(...volumeEvents);
      }

      // Update price tracking
      for (const market of markets) {
        const price = parseFloat(market.outcomePrices?.[0] || '0');
        this.previousPrices.set(market.condition_id, price);
      }
    } catch (error) {
      this.logger.error(`Polymarket fetch error: ${error.message}`);
    }

    this.logger.log(`Generated ${events.length} Polymarket events`);
    return events;
  }

  async fetchActiveMarkets(limit = 100): Promise<PolymarketMarket[]> {
    const url = `${this.baseUrl}/markets?active=true&closed=false&limit=${limit}&order=volume&ascending=false`;

    const response = await this.fetchWithRetry(async () => {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    });

    return response || [];
  }

  async fetchMarket(conditionId: string): Promise<PolymarketMarket | null> {
    const url = `${this.baseUrl}/markets/${conditionId}`;

    try {
      const response = await this.fetchWithRetry(async () => {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      });

      return response;
    } catch (error) {
      this.logger.error(`Error fetching market ${conditionId}: ${error.message}`);
      return null;
    }
  }

  async fetchMarketsByCategory(category: string): Promise<PolymarketMarket[]> {
    const url = `${this.baseUrl}/markets?active=true&closed=false&tag=${encodeURIComponent(category)}&limit=50`;

    const response = await this.fetchWithRetry(async () => {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    });

    return response || [];
  }

  private detectPriceMovement(market: PolymarketMarket): RawEvent[] {
    const events: RawEvent[] = [];
    const currentPrice = parseFloat(market.outcomePrices?.[0] || '0');
    const previousPrice = this.previousPrices.get(market.condition_id);

    if (previousPrice !== undefined) {
      const priceDelta = currentPrice - previousPrice;
      const percentChange = previousPrice > 0 ? (priceDelta / previousPrice) * 100 : 0;

      // Alert on significant moves (>5%)
      if (Math.abs(percentChange) >= 5) {
        events.push({
          timestamp: new Date(),
          eventType: 'polymarket_price_move',
          entity: market.condition_id,
          value: percentChange,
          metadata: {
            question: market.question,
            currentPrice,
            previousPrice,
            priceDelta,
            percentChange,
            volume: market.volume,
            direction: priceDelta > 0 ? 'up' : 'down',
          },
        });
      }
    }

    return events;
  }

  private detectVolumeSpike(market: PolymarketMarket): RawEvent[] {
    const events: RawEvent[] = [];
    const volume = parseFloat(market.volume || '0');

    // High volume markets (>$100k) are noteworthy
    if (volume > 100000) {
      // Only track if this is first time seeing high volume
      // In production, would compare to historical average
      events.push({
        timestamp: new Date(),
        eventType: 'polymarket_high_volume',
        entity: market.condition_id,
        value: volume,
        metadata: {
          question: market.question,
          volume,
          liquidity: market.liquidity,
          category: market.category,
          tags: market.tags,
        },
      });
    }

    return events;
  }

  // Get markets related to specific topics for correlation analysis
  async fetchElectionMarkets(): Promise<PolymarketMarket[]> {
    return this.fetchMarketsByCategory('elections');
  }

  async fetchCryptoMarkets(): Promise<PolymarketMarket[]> {
    return this.fetchMarketsByCategory('crypto');
  }

  async fetchPoliticsMarkets(): Promise<PolymarketMarket[]> {
    return this.fetchMarketsByCategory('politics');
  }
}
