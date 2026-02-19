import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { EventsModule } from '../modules/events';
import { MarketDataModule } from '../modules/market-data';

import { EdgarService } from './edgar.service';
import { FredService } from './fred.service';
import { GdeltService } from './gdelt.service';
import { PolymarketService } from './polymarket.service';
import { IngestionScheduler } from './ingestion.scheduler';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    EventsModule,
    MarketDataModule,
  ],
  providers: [
    EdgarService,
    FredService,
    GdeltService,
    PolymarketService,
    IngestionScheduler,
  ],
  exports: [
    EdgarService,
    FredService,
    GdeltService,
    PolymarketService,
  ],
})
export class IngestionModule {}
