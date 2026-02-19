import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { MarketData } from '../../entities/market-data.entity';
import { AppEvents } from '../../common/events';

@Injectable()
export class MarketDataService {
  constructor(
    @InjectRepository(MarketData)
    private marketDataRepository: Repository<MarketData>,
    private eventEmitter: EventEmitter2,
  ) {}

  async create(data: Partial<MarketData>): Promise<MarketData> {
    const marketData = this.marketDataRepository.create(data);
    const saved = await this.marketDataRepository.save(marketData);

    this.eventEmitter.emit(AppEvents.MARKET_DATA_CREATED, {
      asset: saved.asset,
      timestamp: saved.timestamp,
      price: saved.price,
    });

    return saved;
  }

  async createBatch(dataPoints: Partial<MarketData>[]): Promise<MarketData[]> {
    const entities = this.marketDataRepository.create(dataPoints);
    return this.marketDataRepository.save(entities);
  }

  async findByAsset(
    asset: string,
    startDate?: Date,
    endDate?: Date,
    limit = 1000,
  ): Promise<MarketData[]> {
    const query = this.marketDataRepository
      .createQueryBuilder('md')
      .where('md.asset = :asset', { asset });

    if (startDate && endDate) {
      query.andWhere('md.timestamp BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    } else if (startDate) {
      query.andWhere('md.timestamp >= :startDate', { startDate });
    } else if (endDate) {
      query.andWhere('md.timestamp <= :endDate', { endDate });
    }

    query.orderBy('md.timestamp', 'ASC').take(limit);

    return query.getMany();
  }

  async getLatestPrice(asset: string): Promise<MarketData | null> {
    return this.marketDataRepository.findOne({
      where: { asset },
      order: { timestamp: 'DESC' },
    });
  }

  async getAssets(): Promise<string[]> {
    const result = await this.marketDataRepository
      .createQueryBuilder('md')
      .select('DISTINCT md.asset', 'asset')
      .getRawMany();
    return result.map((r) => r.asset);
  }

  // Get OHLCV data for analysis
  async getOHLCV(
    asset: string,
    startDate: Date,
    endDate: Date,
  ): Promise<
    {
      timestamp: Date;
      open: number;
      high: number;
      low: number;
      close: number;
      volume: number;
    }[]
  > {
    const data = await this.findByAsset(asset, startDate, endDate);

    return data.map((d) => ({
      timestamp: d.timestamp,
      open: Number(d.open) || Number(d.price),
      high: Number(d.high) || Number(d.price),
      low: Number(d.low) || Number(d.price),
      close: Number(d.close) || Number(d.price),
      volume: Number(d.volume) || 0,
    }));
  }

  // Get price time series for correlation analysis
  async getPriceTimeSeries(
    asset: string,
    startDate: Date,
    endDate: Date,
  ): Promise<{ timestamp: Date; price: number }[]> {
    const data = await this.findByAsset(asset, startDate, endDate);

    return data.map((d) => ({
      timestamp: d.timestamp,
      price: Number(d.close) || Number(d.price),
    }));
  }

  // Calculate returns for statistical analysis
  async getReturns(
    asset: string,
    startDate: Date,
    endDate: Date,
  ): Promise<{ timestamp: Date; return: number }[]> {
    const prices = await this.getPriceTimeSeries(asset, startDate, endDate);

    const returns: { timestamp: Date; return: number }[] = [];
    for (let i = 1; i < prices.length; i++) {
      const prevPrice = prices[i - 1].price;
      const currPrice = prices[i].price;
      if (prevPrice > 0) {
        returns.push({
          timestamp: prices[i].timestamp,
          return: (currPrice - prevPrice) / prevPrice,
        });
      }
    }

    return returns;
  }
}
