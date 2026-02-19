import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { EventsService, EventFilters } from './events.service';
import { Event, EventSource } from '../../entities/event.entity';

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  async create(@Body() eventData: Partial<Event>): Promise<Event> {
    return this.eventsService.create(eventData);
  }

  @Post('batch')
  async createBatch(@Body() events: Partial<Event>[]): Promise<Event[]> {
    return this.eventsService.createBatch(events);
  }

  @Get()
  async findAll(
    @Query('source') source?: EventSource,
    @Query('eventType') eventType?: string,
    @Query('entity') entity?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ): Promise<Event[]> {
    const filters: EventFilters = {
      source,
      eventType,
      entity,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit: limit ? parseInt(limit, 10) : 100,
      offset: offset ? parseInt(offset, 10) : 0,
    };
    return this.eventsService.findAll(filters);
  }

  @Get('types')
  async getEventTypes(): Promise<string[]> {
    return this.eventsService.getEventTypes();
  }

  @Get('entities')
  async getEntities(@Query('source') source?: EventSource): Promise<string[]> {
    return this.eventsService.getEntities(source);
  }

  @Get('count')
  async count(
    @Query('source') source?: EventSource,
    @Query('eventType') eventType?: string,
    @Query('entity') entity?: string,
  ): Promise<{ count: number }> {
    const count = await this.eventsService.count({ source, eventType, entity });
    return { count };
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<Event | null> {
    return this.eventsService.findOne(id);
  }
}
