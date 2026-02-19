import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseIngestionService, RawEvent } from './base.service';

interface GdeltArticle {
  url: string;
  title: string;
  seendate: string;
  socialimage?: string;
  domain: string;
  language: string;
  sourcecountry?: string;
  tone?: number;
}

interface GdeltTimelinePoint {
  date: string;
  value: number;
}

@Injectable()
export class GdeltService extends BaseIngestionService {
  protected readonly logger = new Logger(GdeltService.name);
  protected readonly sourceName = 'GDELT';

  private readonly baseUrl = 'https://api.gdeltproject.org/api/v2';

  // Topics to monitor
  private readonly monitoredTopics = [
    { query: 'oil AND (OPEC OR production OR pipeline)', eventType: 'oil_news' },
    { query: 'federal reserve OR fed AND (rate OR inflation)', eventType: 'fed_news' },
    { query: 'military AND (strike OR attack OR conflict)', eventType: 'conflict' },
    { query: 'sanctions AND (Russia OR China OR Iran)', eventType: 'sanctions' },
    { query: 'tariff OR trade war', eventType: 'trade_policy' },
    { query: 'earnings AND (beat OR miss OR surprise)', eventType: 'earnings' },
    { query: 'IPO OR "initial public offering"', eventType: 'ipo' },
    { query: 'merger OR acquisition OR takeover', eventType: 'ma' },
  ];

  constructor(private configService: ConfigService) {
    super();
  }

  async fetch(): Promise<RawEvent[]> {
    const events: RawEvent[] = [];

    for (const topic of this.monitoredTopics) {
      try {
        const topicEvents = await this.fetchTopic(topic.query, topic.eventType);
        events.push(...topicEvents);
      } catch (error) {
        this.logger.error(`Error fetching GDELT topic ${topic.eventType}: ${error.message}`);
      }
    }

    this.logger.log(`Fetched ${events.length} GDELT events`);
    return events;
  }

  async fetchTopic(query: string, eventType: string): Promise<RawEvent[]> {
    const encodedQuery = encodeURIComponent(query);
    const url = `${this.baseUrl}/doc/doc?query=${encodedQuery}&mode=artlist&maxrecords=50&format=json&timespan=24h`;

    const response = await this.fetchWithRetry(async () => {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    });

    const articles: GdeltArticle[] = response.articles || [];

    return articles.map((article) => ({
      timestamp: this.parseGdeltDate(article.seendate),
      eventType,
      entity: article.domain,
      value: article.tone,
      metadata: {
        title: article.title,
        url: article.url,
        domain: article.domain,
        language: article.language,
        country: article.sourcecountry,
        tone: article.tone,
      },
    }));
  }

  async getTimeline(query: string, timespan = '7d'): Promise<GdeltTimelinePoint[]> {
    const encodedQuery = encodeURIComponent(query);
    const url = `${this.baseUrl}/doc/doc?query=${encodedQuery}&mode=timelinevol&timespan=${timespan}&format=json`;

    try {
      const response = await this.fetchWithRetry(async () => {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      });

      const timeline = response.timeline?.[0]?.data || [];

      return timeline.map((point: { date: string; value: number }) => ({
        date: point.date,
        value: point.value,
      }));
    } catch (error) {
      this.logger.error(`Error fetching GDELT timeline: ${error.message}`);
      return [];
    }
  }

  async getGeoEvents(
    query: string,
    timespan = '24h',
    limit = 100,
  ): Promise<RawEvent[]> {
    const encodedQuery = encodeURIComponent(query);
    const url = `${this.baseUrl}/geo/geo?query=${encodedQuery}&format=geojson&timespan=${timespan}&maxpoints=${limit}`;

    try {
      const response = await this.fetchWithRetry(async () => {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      });

      const features = response.features || [];

      return features.map((feature: any) => ({
        timestamp: this.parseGdeltDate(feature.properties?.date),
        eventType: 'geo_event',
        entity: feature.properties?.name,
        metadata: {
          coordinates: feature.geometry?.coordinates,
          name: feature.properties?.name,
          url: feature.properties?.url,
          shareimage: feature.properties?.shareimage,
        },
      }));
    } catch (error) {
      this.logger.error(`Error fetching GDELT geo events: ${error.message}`);
      return [];
    }
  }

  async getToneAnalysis(query: string): Promise<{ avgTone: number; articles: number }> {
    const encodedQuery = encodeURIComponent(query);
    const url = `${this.baseUrl}/doc/doc?query=${encodedQuery}&mode=tonechart&timespan=24h&format=json`;

    try {
      const response = await this.fetchWithRetry(async () => {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      });

      // Calculate average tone from response
      const tones = response.tonechart?.[0]?.data || [];
      if (tones.length === 0) {
        return { avgTone: 0, articles: 0 };
      }

      const totalTone = tones.reduce((sum: number, t: any) => sum + (t.tone || 0), 0);
      const totalArticles = tones.reduce((sum: number, t: any) => sum + (t.count || 0), 0);

      return {
        avgTone: totalTone / tones.length,
        articles: totalArticles,
      };
    } catch (error) {
      this.logger.error(`Error fetching GDELT tone: ${error.message}`);
      return { avgTone: 0, articles: 0 };
    }
  }

  private parseGdeltDate(dateStr: string): Date {
    // GDELT dates can be in various formats
    if (!dateStr) return new Date();

    // Format: YYYYMMDDHHMMSS
    if (/^\d{14}$/.test(dateStr)) {
      const year = dateStr.substring(0, 4);
      const month = dateStr.substring(4, 6);
      const day = dateStr.substring(6, 8);
      const hour = dateStr.substring(8, 10);
      const min = dateStr.substring(10, 12);
      const sec = dateStr.substring(12, 14);
      return new Date(`${year}-${month}-${day}T${hour}:${min}:${sec}Z`);
    }

    return new Date(dateStr);
  }
}
