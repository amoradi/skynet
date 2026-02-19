import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Relationship } from '../../entities/relationship.entity';
import { AppEvents, RelationshipDiscoveredPayload } from '../../common/events';

@Injectable()
export class RelationshipsService {
  constructor(
    @InjectRepository(Relationship)
    private relationshipsRepository: Repository<Relationship>,
    private eventEmitter: EventEmitter2,
  ) {}

  async create(data: Partial<Relationship>): Promise<Relationship> {
    const relationship = this.relationshipsRepository.create(data);
    const saved = await this.relationshipsRepository.save(relationship);

    // Emit discovery event
    const payload: RelationshipDiscoveredPayload = {
      relationshipId: saved.id,
      eventType: saved.eventType,
      marketAsset: saved.marketAsset,
      pValue: Number(saved.pValue),
      hitRate: Number(saved.hitRate),
    };
    this.eventEmitter.emit(AppEvents.RELATIONSHIP_DISCOVERED, payload);

    return saved;
  }

  async findAll(onlySignificant = false): Promise<Relationship[]> {
    const where = onlySignificant ? { isSignificant: true } : {};
    return this.relationshipsRepository.find({
      where,
      order: { pValue: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Relationship | null> {
    return this.relationshipsRepository.findOne({ where: { id } });
  }

  async findByEventType(eventType: string): Promise<Relationship[]> {
    return this.relationshipsRepository.find({
      where: { eventType },
      order: { pValue: 'ASC' },
    });
  }

  async findByMarketAsset(marketAsset: string): Promise<Relationship[]> {
    return this.relationshipsRepository.find({
      where: { marketAsset },
      order: { pValue: 'ASC' },
    });
  }

  async findSignificant(maxPValue = 0.05): Promise<Relationship[]> {
    return this.relationshipsRepository.find({
      where: {
        pValue: LessThanOrEqual(maxPValue),
        isSignificant: true,
      },
      order: { hitRate: 'DESC' },
    });
  }

  async update(
    id: string,
    data: Partial<Relationship>,
  ): Promise<Relationship | null> {
    await this.relationshipsRepository.update(id, data);
    return this.findOne(id);
  }

  async markValidated(id: string): Promise<Relationship | null> {
    await this.relationshipsRepository.update(id, {
      validatedAt: new Date(),
    });

    const relationship = await this.findOne(id);
    if (relationship) {
      this.eventEmitter.emit(AppEvents.RELATIONSHIP_VALIDATED, {
        relationshipId: id,
      });
    }

    return relationship;
  }

  async getStats(): Promise<{
    total: number;
    significant: number;
    avgHitRate: number;
    avgEdge: number;
  }> {
    const all = await this.relationshipsRepository.find();
    const significant = all.filter((r) => r.isSignificant);

    return {
      total: all.length,
      significant: significant.length,
      avgHitRate:
        significant.length > 0
          ? significant.reduce((sum, r) => sum + Number(r.hitRate), 0) /
            significant.length
          : 0,
      avgEdge:
        significant.length > 0
          ? significant.reduce((sum, r) => sum + Number(r.edge), 0) /
            significant.length
          : 0,
    };
  }
}
