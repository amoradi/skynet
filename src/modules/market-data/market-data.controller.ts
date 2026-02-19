import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { MarketDataService } from './market-data.service';
import { MarketData } from '../../entities/market-data.entity';

@Controller('market-data')
export class MarketDataController {
  constructor(private readonly marketDataService: MarketDataService) {}

  @Post()
  async create(@Body() data: Partial<MarketData>): Promise<MarketData> {
    return this.marketDataService.create(data);
  }

  @Post('batch')
  async createBatch(
    @Body() dataPoints: Partial<MarketData>[],
  ): Promise<MarketData[]> {
    return this.marketDataService.createBatch(dataPoints);
  }

  @Get('assets')
  async getAssets(): Promise<string[]> {
    return this.marketDataService.getAssets();
  }

  @Get(':asset')
  async findByAsset(
    @Param('asset') asset: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: string,
  ): Promise<MarketData[]> {
    return this.marketDataService.findByAsset(
      asset,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
      limit ? parseInt(limit, 10) : 1000,
    );
  }

  @Get(':asset/latest')
  async getLatestPrice(
    @Param('asset') asset: string,
  ): Promise<MarketData | null> {
    return this.marketDataService.getLatestPrice(asset);
  }

  @Get(':asset/ohlcv')
  async getOHLCV(
    @Param('asset') asset: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.marketDataService.getOHLCV(
      asset,
      new Date(startDate),
      new Date(endDate),
    );
  }

  @Get(':asset/returns')
  async getReturns(
    @Param('asset') asset: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.marketDataService.getReturns(
      asset,
      new Date(startDate),
      new Date(endDate),
    );
  }
}
