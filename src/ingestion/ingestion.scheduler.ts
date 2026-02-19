import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EventsService } from '../modules/events/events.service';
import { EventSource } from '../entities/event.entity';
import { EdgarService } from './edgar.service';
import { FredService } from './fred.service';
import { GdeltService } from './gdelt.service';
import { PolymarketService } from './polymarket.service';
import { AppEvents } from '../common/events';

@Injectable()
export class IngestionScheduler implements OnModuleInit {
  private readonly logger = new Logger(IngestionScheduler.name);

  constructor(
    private eventsService: EventsService,
    private edgarService: EdgarService,
    private fredService: FredService,
    private gdeltService: GdeltService,
    private polymarketService: PolymarketService,
    private eventEmitter: EventEmitter2,
  ) {}

  async onModuleInit() {
    this.logger.log('Ingestion scheduler initialized');
    // Run initial fetch on startup (optional)
    // await this.runAllIngestion();
  }

  // EDGAR: Every 15 minutes (SEC updates frequently during market hours)
  @Cron('*/15 * * * *')
  async ingestEdgar() {
    this.logger.log('Starting EDGAR ingestion...');
    try {
      const rawEvents = await this.edgarService.fetch();
      await this.saveEvents(rawEvents, EventSource.EDGAR);
      this.logger.log(`EDGAR ingestion complete: ${rawEvents.length} events`);
    } catch (error) {
      this.logger.error(`EDGAR ingestion failed: ${error.message}`);
    }
  }

  // FRED: Daily at 9am ET (most economic data released in morning)
  @Cron('0 9 * * *', { timeZone: 'America/New_York' })
  async ingestFred() {
    this.logger.log('Starting FRED ingestion...');
    try {
      const rawEvents = await this.fredService.fetch();
      await this.saveEvents(rawEvents, EventSource.FRED);
      this.logger.log(`FRED ingestion complete: ${rawEvents.length} events`);
    } catch (error) {
      this.logger.error(`FRED ingestion failed: ${error.message}`);
    }
  }

  // GDELT: Every 15 minutes (news updates continuously)
  @Cron('*/15 * * * *')
  async ingestGdelt() {
    this.logger.log('Starting GDELT ingestion...');
    try {
      const rawEvents = await this.gdeltService.fetch();
      await this.saveEvents(rawEvents, EventSource.GDELT);
      this.logger.log(`GDELT ingestion complete: ${rawEvents.length} events`);
    } catch (error) {
      this.logger.error(`GDELT ingestion failed: ${error.message}`);
    }
  }

  // Polymarket: Every 5 minutes (prediction markets update frequently)
  @Cron('*/5 * * * *')
  async ingestPolymarket() {
    this.logger.log('Starting Polymarket ingestion...');
    try {
      const rawEvents = await this.polymarketService.fetch();
      await this.saveEvents(rawEvents, EventSource.POLYMARKET);
      this.logger.log(`Polymarket ingestion complete: ${rawEvents.length} events`);
    } catch (error) {
      this.logger.error(`Polymarket ingestion failed: ${error.message}`);
    }
  }

  // Run all ingestion (for manual trigger or initial load)
  async runAllIngestion() {
    this.logger.log('Running full ingestion...');
    await Promise.all([
      this.ingestEdgar(),
      this.ingestFred(),
      this.ingestGdelt(),
      this.ingestPolymarket(),
    ]);
    this.logger.log('Full ingestion complete');
  }

  private async saveEvents(
    rawEvents: { timestamp: Date; eventType: string; entity?: string; value?: number; metadata?: Record<string, any> }[],
    source: EventSource,
  ) {
    if (rawEvents.length === 0) return;

    const events = rawEvents.map((raw) => ({
      timestamp: raw.timestamp,
      source,
      eventType: raw.eventType,
      entity: raw.entity,
      value: raw.value,
      metadata: raw.metadata,
    }));

    await this.eventsService.createBatch(events);
  }
}
