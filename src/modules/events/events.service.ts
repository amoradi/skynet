import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Event, EventSource } from '../../entities/event.entity';
import {
  AppEvents,
  EventCreatedPayload,
  EventBatchCreatedPayload,
} from '../../common/events';

export interface EventFilters {
  source?: EventSource;
  eventType?: string;
  entity?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(Event)
    private eventsRepository: Repository<Event>,
    private eventEmitter: EventEmitter2,
  ) {}

  async create(eventData: Partial<Event>): Promise<Event> {
    const event = this.eventsRepository.create(eventData);
    const saved = await this.eventsRepository.save(event);

    // Emit event for other modules to react
    const payload: EventCreatedPayload = {
      eventId: saved.id,
      source: saved.source,
      eventType: saved.eventType,
      entity: saved.entity,
      timestamp: saved.timestamp,
    };
    this.eventEmitter.emit(AppEvents.EVENT_CREATED, payload);

    return saved;
  }

  async createBatch(events: Partial<Event>[]): Promise<Event[]> {
    const entities = this.eventsRepository.create(events);
    const saved = await this.eventsRepository.save(entities);

    // Emit batch event
    const payload: EventBatchCreatedPayload = {
      count: saved.length,
      source: saved[0]?.source || 'unknown',
      eventIds: saved.map((e) => e.id),
    };
    this.eventEmitter.emit(AppEvents.EVENT_BATCH_CREATED, payload);

    return saved;
  }

  async findAll(filters: EventFilters = {}): Promise<Event[]> {
    const {
      source,
      eventType,
      entity,
      startDate,
      endDate,
      limit = 100,
      offset = 0,
    } = filters;

    const query = this.eventsRepository.createQueryBuilder('event');

    if (source) {
      query.andWhere('event.source = :source', { source });
    }

    if (eventType) {
      query.andWhere('event.eventType = :eventType', { eventType });
    }

    if (entity) {
      query.andWhere('event.entity = :entity', { entity });
    }

    if (startDate && endDate) {
      query.andWhere('event.timestamp BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    } else if (startDate) {
      query.andWhere('event.timestamp >= :startDate', { startDate });
    } else if (endDate) {
      query.andWhere('event.timestamp <= :endDate', { endDate });
    }

    query.orderBy('event.timestamp', 'DESC').skip(offset).take(limit);

    return query.getMany();
  }

  async findOne(id: string): Promise<Event | null> {
    return this.eventsRepository.findOne({ where: { id } });
  }

  async findBySource(source: EventSource, limit = 100): Promise<Event[]> {
    return this.eventsRepository.find({
      where: { source },
      order: { timestamp: 'DESC' },
      take: limit,
    });
  }

  async findByEntity(entity: string, limit = 100): Promise<Event[]> {
    return this.eventsRepository.find({
      where: { entity },
      order: { timestamp: 'DESC' },
      take: limit,
    });
  }

  async getEventTypes(): Promise<string[]> {
    const result = await this.eventsRepository
      .createQueryBuilder('event')
      .select('DISTINCT event.eventType', 'eventType')
      .getRawMany();
    return result.map((r) => r.eventType);
  }

  async getEntities(source?: EventSource): Promise<string[]> {
    const query = this.eventsRepository
      .createQueryBuilder('event')
      .select('DISTINCT event.entity', 'entity');

    if (source) {
      query.where('event.source = :source', { source });
    }

    const result = await query.getRawMany();
    return result.map((r) => r.entity).filter(Boolean);
  }

  async count(filters: EventFilters = {}): Promise<number> {
    const { source, eventType, entity, startDate, endDate } = filters;

    const query = this.eventsRepository.createQueryBuilder('event');

    if (source) {
      query.andWhere('event.source = :source', { source });
    }
    if (eventType) {
      query.andWhere('event.eventType = :eventType', { eventType });
    }
    if (entity) {
      query.andWhere('event.entity = :entity', { entity });
    }
    if (startDate) {
      query.andWhere('event.timestamp >= :startDate', { startDate });
    }
    if (endDate) {
      query.andWhere('event.timestamp <= :endDate', { endDate });
    }

    return query.getCount();
  }

  // Time series helpers for analysis
  async getEventTimeSeries(
    source: EventSource,
    eventType: string,
    startDate: Date,
    endDate: Date,
  ): Promise<{ timestamp: Date; value: number; entity: string }[]> {
    const events = await this.eventsRepository.find({
      where: {
        source,
        eventType,
      },
      order: { timestamp: 'ASC' },
    });

    return events
      .filter((e) => e.timestamp >= startDate && e.timestamp <= endDate)
      .map((e) => ({
        timestamp: e.timestamp,
        value: e.value ? Number(e.value) : 1,
        entity: e.entity,
      }));
  }
}
