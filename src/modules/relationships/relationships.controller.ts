import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { RelationshipsService } from './relationships.service';
import { Relationship } from '../../entities/relationship.entity';

@Controller('relationships')
export class RelationshipsController {
  constructor(private readonly relationshipsService: RelationshipsService) {}

  @Post()
  async create(@Body() data: Partial<Relationship>): Promise<Relationship> {
    return this.relationshipsService.create(data);
  }

  @Get()
  async findAll(
    @Query('significant') significant?: string,
  ): Promise<Relationship[]> {
    return this.relationshipsService.findAll(significant === 'true');
  }

  @Get('significant')
  async findSignificant(
    @Query('maxPValue') maxPValue?: string,
  ): Promise<Relationship[]> {
    return this.relationshipsService.findSignificant(
      maxPValue ? parseFloat(maxPValue) : 0.05,
    );
  }

  @Get('stats')
  async getStats() {
    return this.relationshipsService.getStats();
  }

  @Get('by-event/:eventType')
  async findByEventType(
    @Param('eventType') eventType: string,
  ): Promise<Relationship[]> {
    return this.relationshipsService.findByEventType(eventType);
  }

  @Get('by-asset/:marketAsset')
  async findByMarketAsset(
    @Param('marketAsset') marketAsset: string,
  ): Promise<Relationship[]> {
    return this.relationshipsService.findByMarketAsset(marketAsset);
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<Relationship | null> {
    return this.relationshipsService.findOne(id);
  }

  @Post(':id/validate')
  async validate(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<Relationship | null> {
    return this.relationshipsService.markValidated(id);
  }
}
