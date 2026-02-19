import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseIngestionService, RawEvent } from './base.service';

interface FredObservation {
  date: string;
  value: string;
}

interface FredSeries {
  id: string;
  title: string;
  frequency: string;
  units: string;
  lastUpdated: string;
}

@Injectable()
export class FredService extends BaseIngestionService {
  protected readonly logger = new Logger(FredService.name);
  protected readonly sourceName = 'FRED';

  private readonly baseUrl = 'https://api.stlouisfed.org/fred';
  private readonly apiKey: string;

  // Key economic indicators to track
  private readonly trackedSeries = [
    { id: 'FEDFUNDS', name: 'Federal Funds Rate', eventType: 'fed_rate' },
    { id: 'UNRATE', name: 'Unemployment Rate', eventType: 'unemployment' },
    { id: 'CPIAUCSL', name: 'CPI', eventType: 'cpi' },
    { id: 'GDP', name: 'GDP', eventType: 'gdp' },
    { id: 'T10Y2Y', name: '10Y-2Y Spread', eventType: 'yield_curve' },
    { id: 'VIXCLS', name: 'VIX', eventType: 'vix' },
    { id: 'DCOILWTICO', name: 'WTI Crude Oil', eventType: 'oil_price' },
    { id: 'DGS10', name: '10-Year Treasury', eventType: 'treasury_10y' },
    { id: 'BAMLH0A0HYM2', name: 'High Yield Spread', eventType: 'credit_spread' },
    { id: 'MORTGAGE30US', name: '30-Year Mortgage', eventType: 'mortgage_rate' },
  ];

  constructor(private configService: ConfigService) {
    super();
    this.apiKey = this.configService.get('FRED_API_KEY') || '';
  }

  async fetch(): Promise<RawEvent[]> {
    if (!this.apiKey) {
      this.logger.warn('FRED_API_KEY not configured, skipping FRED ingestion');
      return [];
    }

    const events: RawEvent[] = [];

    for (const series of this.trackedSeries) {
      try {
        const seriesEvents = await this.fetchSeries(series.id, series.eventType);
        events.push(...seriesEvents);
      } catch (error) {
        this.logger.error(`Error fetching FRED series ${series.id}: ${error.message}`);
      }
    }

    this.logger.log(`Fetched ${events.length} FRED data points`);
    return events;
  }

  async fetchSeries(
    seriesId: string,
    eventType: string,
    limit = 10,
  ): Promise<RawEvent[]> {
    const url = `${this.baseUrl}/series/observations?series_id=${seriesId}&api_key=${this.apiKey}&file_type=json&sort_order=desc&limit=${limit}`;

    const response = await this.fetchWithRetry(async () => {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    });

    const observations: FredObservation[] = response.observations || [];

    return observations
      .filter((obs) => obs.value !== '.')
      .map((obs) => ({
        timestamp: new Date(obs.date),
        eventType,
        entity: seriesId,
        value: parseFloat(obs.value),
        metadata: {
          seriesId,
          rawValue: obs.value,
        },
      }));
  }

  async getSeriesInfo(seriesId: string): Promise<FredSeries | null> {
    if (!this.apiKey) return null;

    const url = `${this.baseUrl}/series?series_id=${seriesId}&api_key=${this.apiKey}&file_type=json`;

    try {
      const response = await this.fetchWithRetry(async () => {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      });

      const series = response.seriess?.[0];
      if (!series) return null;

      return {
        id: series.id,
        title: series.title,
        frequency: series.frequency,
        units: series.units,
        lastUpdated: series.last_updated,
      };
    } catch (error) {
      this.logger.error(`Error fetching FRED series info: ${error.message}`);
      return null;
    }
  }

  // Fetch historical data for backtesting
  async fetchHistorical(
    seriesId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<RawEvent[]> {
    if (!this.apiKey) return [];

    const start = startDate.toISOString().split('T')[0];
    const end = endDate.toISOString().split('T')[0];

    const url = `${this.baseUrl}/series/observations?series_id=${seriesId}&api_key=${this.apiKey}&file_type=json&observation_start=${start}&observation_end=${end}`;

    const response = await this.fetchWithRetry(async () => {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    });

    const observations: FredObservation[] = response.observations || [];
    const seriesConfig = this.trackedSeries.find((s) => s.id === seriesId);

    return observations
      .filter((obs) => obs.value !== '.')
      .map((obs) => ({
        timestamp: new Date(obs.date),
        eventType: seriesConfig?.eventType || 'economic_indicator',
        entity: seriesId,
        value: parseFloat(obs.value),
        metadata: {
          seriesId,
        },
      }));
  }
}
