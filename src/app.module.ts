import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';

import { databaseConfig } from './config/database.config';
import { AppController } from './app.controller';
import { AppService } from './app.service';

// Feature modules
import { EventsModule } from './modules/events';
import { RelationshipsModule } from './modules/relationships';
import { AlertsModule } from './modules/alerts';
import { HypothesesModule } from './modules/hypotheses';
import { MarketDataModule } from './modules/market-data';
import { IngestionModule } from './ingestion';

@Module({
  imports: [
    // Config
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),

    // Event emitter for loose coupling
    EventEmitterModule.forRoot({
      wildcard: false,
      delimiter: '.',
      newListener: false,
      removeListener: false,
      maxListeners: 20,
      verboseMemoryLeak: true,
      ignoreErrors: false,
    }),

    // Database
    TypeOrmModule.forRoot(databaseConfig()),

    // Feature modules
    EventsModule,
    RelationshipsModule,
    AlertsModule,
    HypothesesModule,
    MarketDataModule,
    IngestionModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
